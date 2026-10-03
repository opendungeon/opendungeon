import { error, json, redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as live from "#lib/server/live/index.js";
import { isGamePlayer } from "#lib/server/database/games.js";

export const GET: RequestHandler = async ({ locals, params }) => {
  const { session } = locals;
  if (!session) {
    redirect(303, "/sign-in");
  }

  const { id: gameId } = params;
  const hasPerm = await isGamePlayer(gameId, session.user_id);
  if (!hasPerm) {
    error(404, "Game not found.");
  }

  const state = await live.getState(gameId);
  if (!state) {
    error(404, "Game not found.");
  }

  return json(state);
};
