import type { PageServerLoad } from "./$types";
import { createGame, deleteGame, listGamesWithPlayerProfiles } from "#lib/server/database/games.js";
import { deleteLevel, listUserLevels } from "#lib/server/database/levels.js";
import { getProfile } from "#lib/server/database/profiles.js";
import { fail, redirect, type Actions } from "@sveltejs/kit";
import { files } from "#lib/server/files/index.js";
import { games, GameServer } from "#lib/server/games.js";
import { createPlayer } from "#lib/server/database/players.js";
import { listFriendProfiles } from "#lib/server/database/friends.js";

export const load: PageServerLoad = async ({ parent }) => {
  const { session } = await parent();

  const [profile, games, levels, friends] = await Promise.all([
    getProfile(session.user_id),
    listGamesWithPlayerProfiles(session.user_id),
    listUserLevels(session.user_id),
    listFriendProfiles(session.user_id),
  ]);

  return { profile, levels, games, friends: friends.filter((f) => f.accepted) };
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

    const profile = await getProfile(session.user_id);
    if (!profile) {
      redirect(303, "/profile/new");
    }

    const game = await createGame(
      session.user_id,
      name,
      "games/00000000-0000-0000-0000-000000000000.json",
    );
    const [, gameServer] = await Promise.all([
      createPlayer(game.game_id, session.user_id, "game_master"),
      GameServer.start(game.game_id),
    ]);
    await gameServer.addPlayer({
      isGameMaster: true,
      userId: session.user_id,
      username: profile.username,
      avatarUri: profile.avatar_uri,
      online: false,
    });

    games.add(game.game_id, gameServer);
    return { success: true, gameId: game.game_id };
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
  addplayer: async ({ request }) => {
    const data = await request.formData();

    const gameId = data.get("game-id") as string;
    if (!gameId) {
      return fail(400, { gameId, missing: true });
    }

    const userId = data.get("user-id") as string;
    if (!userId) {
      return fail(400, { userId, missing: true });
    }

    const playerProfile = await getProfile(userId);
    if (!playerProfile) {
      return fail(400, { userId, missing: true });
    }

    await createPlayer(gameId, userId, "player");

    const game = await games.get(gameId);
    if (game) {
      await game.addPlayer({
        isGameMaster: false,
        username: playerProfile.username,
        avatarUri: playerProfile.avatar_uri,
        color: "orange", // GET ACTUAL COLOR
        online: false,
        userId,
      });
    }
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
