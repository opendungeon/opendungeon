import { error, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { listUserCharacters } from "#lib/server/database/characters.js";
import { getUserGameWithPlayerProfiles, updateGame } from "#lib/server/database/games.js";
import { getProfile } from "#lib/server/database/profiles.js";
import { listUserLevels } from "#lib/server/database/levels.js";
import { files } from "#lib/server/files/index.js";
import { type GameState, gamerooms } from "#lib/server/gamerooms.js";
import { listFriendProfiles } from "#lib/server/database/friends.js";
import { createPlayer } from "#lib/server/database/players.js";
import { fail } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ locals, params }) => {
  const { session } = locals;
  if (!session) {
    redirect(303, "/sign-in");
  }

  const { id: gameId } = params;

  const [profile, characters, game, levels, friends] = await Promise.all([
    getProfile(session.user_id),
    listUserCharacters(session.user_id),
    getUserGameWithPlayerProfiles(session.user_id, gameId),
    listUserLevels(session.user_id),
    listFriendProfiles(session.user_id),
  ]);

  if (!profile) {
    redirect(303, "/profile/new");
  }

  if (!game) {
    error(404, "Game not found");
  }

  if (!game.is_active) {
    const file = files.file(game.uri);
    const exists = await file.exists();
    const state: GameState | undefined = !exists ? undefined : await file.json();
    await Promise.all([
      gamerooms.createGame(game.game_id, state),
      updateGame(session.user_id, gameId, { is_active: true }),
    ]);
  }

  return {
    profile,
    game,
    levels,
    characters,
    friends,
  };
};

export const actions = {
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

    const player = await createPlayer(gameId, userId, "player");

    await gamerooms.addGamePlayer(gameId, {
      userId,
      username: playerProfile.username,
      avatarUri: playerProfile.avatar_uri,
      permissionLevel: player.permission_level,
    });
    return { success: true };
  },
} satisfies Actions;
