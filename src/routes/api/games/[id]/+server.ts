import { isGamePlayer } from "#lib/server/database/games.ts";
import { games } from "#lib/server/games/registry.ts";
import type { RequestHandler } from "./$types";
import { error, redirect } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ locals, params }) => {
  const { session } = locals;
  if (!session) {
    redirect(303, "/sign-in");
  }

  const { id: gameId } = params;
  const game = await games.get(gameId);
  if (!game) {
    error(404, "Game not found.");
  }

  const hasPerm = await isGamePlayer(gameId, session.user_id);
  if (!hasPerm) {
    error(404, "Game not found.");
  }

  const state = await game.getState();
  if (!state) {
    error(404, "Game not found.");
  }

  return new Response(JSON.stringify(state), { headers: { "Content-Type": "application/json" } });
};
