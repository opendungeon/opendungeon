import { error, redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { games } from "#lib/server/games.js";

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

  const { x, y }: { x: number; y: number; rot: number } = await request.json();

  // TODO: validate player has perms
  const result = await game.moveCharacter(characterId, x, y);
  if (!result.ok) {
    error(400, result.error);
  }

  return new Response(null, { status: 204 });
};
