import { error, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { listCellTextures } from "$lib/server/database/celltextures";
import { listUserCharacters } from "$lib/server/database/characters";
import { getUserGameWithPlayerProfiles } from "$lib/server/database/games";
import { getProfile } from "$lib/server/database/profiles";
import { listUserLevels } from "$lib/server/database/levels";

export const load: PageServerLoad = async ({ locals, params }) => {
  const { session } = locals;
  if (!session) {
    redirect(303, "/sign-in");
  }

  const { id: gameId } = params;

  const [profile, cellTextures, characters, game, levels] = await Promise.all([
    getProfile(session.user_id),
    listCellTextures(),
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

  return {
    profile,
    cellTextures,
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
