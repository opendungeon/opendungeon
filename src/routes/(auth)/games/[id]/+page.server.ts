import { error, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getProfile } from "#lib/server/database/profiles.js";
import { listUserLevels } from "#lib/server/database/levels.js";
import { listFriendProfiles } from "#lib/server/database/friends.js";
import { fail } from "@sveltejs/kit";
import { games } from "#lib/server/games.js";

export const load: PageServerLoad = async ({ locals, params }) => {
  const { session } = locals;
  if (!session) {
    redirect(303, "/sign-in");
  }

  const { id: gameId } = params;

  const game = await games.get(gameId);
  if (!game) {
    // TODO: start the game

    error(404, "Game not found.");
  }

  const [profile, state, levels, friends] = await Promise.all([
    getProfile(session.user_id),
    game.getState(),
    listUserLevels(session.user_id),
    listFriendProfiles(session.user_id),
  ]);

  if (!profile) {
    redirect(303, "/profile/new");
  }

  if (!game) {
    error(404, "Game not found");
  }

  return {
    friends: friends.filter((f) => f.accepted),
    profile,
    state,
    levels,
  };
};

// TODO: this shouldn't be a form action, move this to an endpoint
export const actions = {
  addplayer: async () => {
    return fail(412, { success: false, message: "Not Implemented" });
  },
} satisfies Actions;
