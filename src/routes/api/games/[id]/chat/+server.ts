import { games } from "#lib/server/games/registry.ts";
import type { RequestHandler } from "./$types";
import { error, redirect } from "@sveltejs/kit";

type RequestBody = { message: string };

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

  const { message }: RequestBody = await request.json();

  await game.sendChat(session.user_id, message);

  return new Response(null, { status: 204 });
};
