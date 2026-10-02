import { error, redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as live from "$lib/server/live";
import { ServerMessageType, type CharacterLoaded } from "$lib/messages";
import { getUserCharacter } from "$lib/server/database/characters";

export const POST: RequestHandler = async ({ locals, params, request }) => {
  const { session } = locals;
  if (!session) {
    redirect(303, "/sign-in");
  }

  const { id: gameId } = params;
  const { characterId, x, y }: { characterId: string; x: number; y: number } = await request.json();

  const character = await getUserCharacter(session.user_id, characterId);
  if (!character) {
    error(404, "Character not found.");
  }

  await live.addCharacter(gameId, {
    userId: session.user_id,
    uri: character.uri,
    characterId,
    x,
    y,
  });

  const message: CharacterLoaded = {
    type: ServerMessageType.CharacterLoaded,
    userId: session.user_id,
    uri: character.uri,
    characterId,
    x,
    y,
  };
  await live.notify(gameId, message);

  return new Response(null, { status: 204 });
};
