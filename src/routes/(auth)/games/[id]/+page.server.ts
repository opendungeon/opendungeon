import { createUserCharacter, listUserCharacters } from "#lib/server/database/characters.ts";
import { listFriendProfiles } from "#lib/server/database/friends.ts";
import { listUserLevels } from "#lib/server/database/levels.ts";
import { getProfile } from "#lib/server/database/profiles.ts";
import { games } from "#lib/server/games.ts";
import type { Actions, PageServerLoad } from "./$types";
import { error, redirect } from "@sveltejs/kit";
import { fail } from "@sveltejs/kit";
import { randomUUID } from "crypto";

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

  const [profile, state, levels, friends, characters] = await Promise.all([
    getProfile(session.user_id),
    game.getState(),
    listUserLevels(session.user_id),
    listFriendProfiles(session.user_id),
    listUserCharacters(session.user_id),
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
    characters,
  };
};

export const actions = {
  // TODO: this shouldn't be a form action, move this to an endpoint
  addplayer: async () => {
    return fail(412, { success: false, message: "Not Implemented" });
  },
  createCharacter: async ({ locals, request }) => {
    const { session } = locals;
    if (!session) {
      redirect(303, "/sign-in");
    }

    const data = await request.formData();
    const name = data.get("name") as string;
    if (!name) {
      return fail(400, { name, missing: true });
    }

    const character = await createUserCharacter(
      session.user_id,
      randomUUID(),
      name,
      "",
    );

    return { success: true, characterId: character.character_id };
  },
} satisfies Actions;
