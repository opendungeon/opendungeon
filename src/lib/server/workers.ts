import { games } from "#lib/server/games.js";
import { files } from "#lib/server/files/index.js";

const MAX_GAME_IDLE_TIME = 5 * 60 * 1000;

export async function cleanupIdleGames(): Promise<number> {
  let cleanupCount = 0;

  for (const [gameId, game] of games) {
    const state = await game.getState();
    const lastDisconnect = !state ? 0 : state.lastDisconnect;
    const isLastDisconnectWithinLimit = lastDisconnect > Date.now() - MAX_GAME_IDLE_TIME;
    if (isLastDisconnectWithinLimit || Object.entries(state?.players ?? {}).length >= 1) {
      continue;
    }

    const newUri = `games/${crypto.randomUUID()}.json`;
    if (state) {
      // TODO: commit game data to file
      const storedGameState = files.file(gameId);
      const exists = await storedGameState.exists();
      if (exists) {
        await storedGameState.delete();
      }

      await files.write(newUri, JSON.stringify(state), {
        type: "application/json",
      });
    }

    await game.destroy();
    await games.delete(gameId);
    cleanupCount++;
  }

  return cleanupCount;
}
