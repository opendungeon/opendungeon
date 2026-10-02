import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as live from "$lib/server/live";
import { ServerMessageType, type MapPinged } from "$lib/messages";

export const POST: RequestHandler = async ({ locals, params, request }) => {
  const { session } = locals;
  if (!session) {
    redirect(303, "/sign-in");
  }

  const { id: gameId } = params;
  const { x, y }: { x: number; y: number } = await request.json();

  const message: MapPinged = {
    type: ServerMessageType.MapPinged,
    userId: session.user_id,
    x,
    y,
  };
  await live.notify(gameId, message);

  return new Response(null, { status: 204 });
};
