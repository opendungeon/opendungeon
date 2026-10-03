import type { PageServerLoad } from "./$types";
import { createGame, deleteGame, listGamesWithPlayerProfiles } from "#lib/server/database/games.js";
import { deleteLevel, listUserLevels } from "#lib/server/database/levels.js";
import { getProfile } from "#lib/server/database/profiles.js";
import { fail, redirect, type Actions } from "@sveltejs/kit";
import { files } from "#lib/server/files/index.js";
import { createGame as createLiveGame } from "#lib/server/live/index.js";
import { createPlayer } from "#lib/server/database/players.js";

export const load: PageServerLoad = async ({ parent }) => {
  const { session } = await parent();

  const [profile, games, levels] = await Promise.all([
    getProfile(session.user_id),
    listGamesWithPlayerProfiles(session.user_id),
    listUserLevels(session.user_id),
  ]);

  return { profile, levels, games };
};

export const actions = {
  creategame: async ({ locals, request }) => {
    const { session } = locals;
    if (!session) {
      redirect(303, "/sign-in");
    }

    const data = await request.formData();
    const name = data.get("name") as string;
    if (!name) {
      return fail(400, { name, missing: true });
    }

    const game = await createGame(session.user_id, name, "TODO: put actual value here");
    await createPlayer(game.game_id, session.user_id, "game_master");
    console.log("created everything up to this point");
    await createLiveGame(game.game_id);
    console.log("created live game");
    return { success: true };
  },
  deletegame: async ({ locals, request }) => {
    const { session } = locals;
    if (!session) {
      redirect(303, "/sign-in");
    }

    const data = await request.formData();
    const gameId = data.get("game-id") as string;
    if (!gameId) {
      return fail(400, { gameId, missing: true });
    }

    const game = await deleteGame(session.user_id, gameId);
    if (game) {
      await files.delete(game.uri);
    }

    return { success: true };
  },
  inviteplayer: async ({ request }) => {
    const data = await request.formData();

    const gameId = data.get("game-id") as string;
    if (!gameId) {
      return fail(400, { gameId, missing: true });
    }

    const userId = data.get("user-id") as string;
    if (!userId) {
      return fail(400, { userId, missing: true });
    }

    await createPlayer(gameId, userId, "player");
    return { success: true };
  },
  deletelevel: async ({ locals, request }) => {
    const { session } = locals;
    if (!session) {
      redirect(303, "/sign-in");
    }

    const data = await request.formData();
    const levelId = data.get("level-id") as string;
    if (!levelId) {
      return fail(400, { levelId, missing: true });
    }

    const level = await deleteLevel(session.user_id, levelId);
    if (level) {
      await files.delete(level.uri);
    }

    return { success: true };
  },
} satisfies Actions;
