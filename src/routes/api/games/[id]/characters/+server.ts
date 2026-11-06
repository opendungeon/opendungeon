import type { Coord } from "#lib/point.ts";
import { games } from "#lib/server/games/registry.ts";
import type { RequestHandler } from "./$types";
import { error, redirect } from "@sveltejs/kit";

type RequestBody = {
  characterId: string;
  name: string;
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

  const { characterId, name, coord }: RequestBody = await request.json();
  const res = await game.loadCharacter(session.user_id, characterId, name, coord);
  if (!res.ok) {
    return new Response(res.error, { status: 400 });
  }

  return new Response(null, { status: 204 });
};
