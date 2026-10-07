import { adminUpdateGame, adminListAllActiveGames } from "#lib/server/database/games.js";
import * as live from "#lib/server/live/index.js";
import { files } from "#lib/server/files/index.js";

const MAX_GAME_IDLE_TIME = 5 * 60 * 1000;

export async function cleanupIdleGames() {
  const games = await adminListAllActiveGames();

  let cleanupCount = 0;
  for (const game of games) {
    const gameState = await live.getState(game.game_id);
    const lastDisconnect = !gameState ? 0 : gameState.lastDisconnect;
    const isLastDisconnectWithinLimit = lastDisconnect > Date.now() - MAX_GAME_IDLE_TIME;
    if (isLastDisconnectWithinLimit) {
      continue;
    }

    const newUri = `games/${crypto.randomUUID()}.json`;
    const storedGameState = files.file(game.uri);
    if (gameState && (await storedGameState.exists())) {
      await storedGameState.delete();
      await files.write(newUri, JSON.stringify(gameState), { type: "application/json" });
    }

    await Promise.all([
      live.deleteGame(game.game_id),
      adminUpdateGame(game.game_id, { is_active: false, uri: gameState ? newUri : undefined }),
    ]);
    cleanupCount++;
  }

  console.log(`Cleaned up ${cleanupCount} idle game(s).`);
}
