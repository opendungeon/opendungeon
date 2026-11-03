import type { Coord } from "#lib/point.ts";
import { games } from "#lib/server/games.ts";
import type { RequestHandler } from "./$types";
import { error, redirect } from "@sveltejs/kit";

type RequestBody = { startTime: number; velocity: number; destination: Coord };

export const PUT: RequestHandler = async ({ locals, params, request }) => {
  const { session } = locals;
  if (!session) {
    redirect(303, "/sign-in");
  }

  const { id: gameId, characterId } = params;
  const game = await games.get(gameId);
  if (!game) {
    error(404, "Game not found.");
  }

  const { startTime, velocity, destination }: RequestBody = await request.json();

  // TODO: validate player has perms
  const result = await game.moveCharacter(characterId, startTime, velocity, destination);
  if (!result.ok) {
    error(400, result.error);
  }

  return new Response(null, { status: 204 });
};
