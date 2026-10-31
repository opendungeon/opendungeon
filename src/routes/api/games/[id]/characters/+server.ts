import { error, redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { games } from "#lib/server/games.js";
import { ServerMessageType, type CharacterLoaded } from "#lib/messages.js";

export const POST: RequestHandler = async ({ locals, params, request }) => {
  const { session } = locals;
  if (!session) {
    redirect(303, "/sign-in");
  }

  const { id: gameId } = params;
  const game = await games.get(gameId);
  if (!game) {
    error(404, "Game not found.");
  }

  const { characterId, x, y, rot }: { characterId: string; x: number; y: number; rot: number } =
    await request.json();

  await game.addCharacter({
    userId: session.user_id,
    characterId,
    x,
    y,
    rot,
  });

  const message: CharacterLoaded = {
    type: ServerMessageType.CharacterLoaded,
    userId: session.user_id,
    characterId,
    x,
    y,
    rot,
  };
  await game.publish(message);

  return new Response(null, { status: 204 });
};
