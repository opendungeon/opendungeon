import { ServerMessageType, type MapPinged } from "#lib/messages.ts";
import { games } from "#lib/server/games.ts";
import type { RequestHandler } from "./$types";
import { error, redirect } from "@sveltejs/kit";

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

  const { x, y }: { x: number; y: number } = await request.json();

  const message: MapPinged = {
    type: ServerMessageType.MapPinged,
    userId: session.user_id,
    x,
    y,
  };
  await game.publish(message);

  return new Response(null, { status: 204 });
};
