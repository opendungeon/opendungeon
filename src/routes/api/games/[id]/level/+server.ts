import { getUserLevel } from "#lib/server/database/levels.ts";
import { games } from "#lib/server/games/registry.ts";
import type { RequestHandler } from "./$types";
import { error, redirect } from "@sveltejs/kit";

type RequestBody = {
  levelId: string;
};

export const PUT: RequestHandler = async ({ locals, params, request }) => {
  const { session } = locals;
  if (!session) {
    redirect(303, "/sign-in");
  }

  const { id: gameId } = params;

  const game = await games.get(gameId);
  if (!game) {
    error(404, "Game not found.");
  }

  const state = await game.getState();

  if (!state.players[session.user_id].isGameMaster) {
    error(403, "Players may not load levels.");
  }

  const { levelId }: RequestBody = await request.json();
  const level = await getUserLevel(session.user_id, levelId);
  if (!level) {
    error(404, "Level not found.");
  }

  const res = await game.setLevelUri(level.uri);
  if (!res.ok) {
    error(400, res.error);
  }

  return new Response(null, { status: 204 });
};
