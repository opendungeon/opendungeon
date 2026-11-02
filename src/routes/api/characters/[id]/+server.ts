import { deleteUserCharacter } from "#lib/server/database/characters.ts";
import type { RequestHandler } from "./$types";
import { redirect } from "@sveltejs/kit";

export const DELETE: RequestHandler = async ({ locals, params }) => {
  const { session } = locals;
  if (!session) {
    redirect(303, "/sign-in");
  }

  const { id: characterId } = params;

  await deleteUserCharacter(session.user_id, characterId);
  // TODO: Delete the media file holding character data (we don't have any yet)

  return new Response(null, { status: 204 });
};
