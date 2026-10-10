import { error, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { listUserCharacters } from "#lib/server/database/characters.js";
import { getUserGameWithPlayerProfiles, updateGame } from "#lib/server/database/games.js";
import { getProfile } from "#lib/server/database/profiles.js";
import { listUserLevels } from "#lib/server/database/levels.js";
import { files } from "#lib/server/files/index.js";
import { type GameState, gamerooms } from "#lib/server/gamerooms.js";

export const load: PageServerLoad = async ({ locals, params }) => {
  const { session } = locals;
  if (!session) {
    redirect(303, "/sign-in");
  }

  const { id: gameId } = params;

  const [profile, characters, game, levels] = await Promise.all([
    getProfile(session.user_id),
    listUserCharacters(session.user_id),
    getUserGameWithPlayerProfiles(session.user_id, gameId),
    listUserLevels(session.user_id),
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
  };
};

export const actions = {
  inviteplayer: async ({ locals }) => {
    const { session } = locals;
    if (!session) {
      redirect(303, "/sign-in");
    }
  },
} satisfies Actions;
