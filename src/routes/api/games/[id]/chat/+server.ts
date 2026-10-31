import { error, redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { games } from "#lib/server/games.js";
import { ServerMessageType, type ChatReceived } from "#lib/messages.js";

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

  const { content }: { content: string } = await request.json();

  const message: ChatReceived = {
    type: ServerMessageType.ChatReceived,
    senderId: session.user_id,
    content,
  };
  await game.publish(message);

  return new Response(null, { status: 204 });
};
