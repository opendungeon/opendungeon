import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as live from "$lib/server/live";
import { ServerMessageType, type ChatReceived } from "$lib/messages";

export const POST: RequestHandler = async ({ locals, params, request }) => {
  const { session } = locals;
  if (!session) {
    redirect(303, "/sign-in");
  }

  const { id: gameId } = params;
  const { content }: { content: string } = await request.json();

  const message: ChatReceived = {
    type: ServerMessageType.ChatReceived,
    senderId: session.user_id,
    content,
  };
  await live.notify(gameId, message);

  return new Response(null, { status: 204 });
};
