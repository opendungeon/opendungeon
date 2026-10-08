import { adminUpdateGame, adminListAllActiveGames } from "#lib/server/database/games.js";
import * as live from "#lib/server/live/index.js";
import { files } from "#lib/server/files/index.js";

const MAX_GAME_IDLE_TIME = 5 * 60 * 1000;

export async function cleanupIdleGames(): Promise<number> {
  const games = await adminListAllActiveGames();

  let cleanupCount = 0;
  for (const game of games) {
    const gameState = await live.getState(game.game_id);
    const lastDisconnect = !gameState ? 0 : gameState.lastDisconnect;
    const isLastDisconnectWithinLimit = lastDisconnect > Date.now() - MAX_GAME_IDLE_TIME;
    if (isLastDisconnectWithinLimit || Object.entries(gameState?.players ?? {}).length >= 1) {
      continue;
    }

    const newUri = `games/${crypto.randomUUID()}.json`;
    if (gameState) {
      const storedGameState = files.file(game.uri);
      const exists = await storedGameState.exists();
      if (exists) {
        await storedGameState.delete();
      }

      await files.write(newUri, JSON.stringify({ ...gameState, players: {} }), {
        type: "application/json",
      });
    }

    await Promise.all([
      live.deleteGame(game.game_id),
      adminUpdateGame(game.game_id, { is_active: false, uri: gameState ? newUri : undefined }),
    ]);
    cleanupCount++;
  }

  return cleanupCount;
}
