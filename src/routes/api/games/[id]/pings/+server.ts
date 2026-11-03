import type { Coord } from "#lib/point.ts";
import { games } from "#lib/server/games.ts";
import type { RequestHandler } from "./$types";
import { error, redirect } from "@sveltejs/kit";

type RequestBody = {
  coord: Coord;
};

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

  const { coord }: RequestBody = await request.json();
  await game.ping(session.user_id, coord);

  return new Response(null, { status: 204 });
};
