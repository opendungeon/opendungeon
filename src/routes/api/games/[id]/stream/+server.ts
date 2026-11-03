import { getPlayer } from "#lib/server/database/players.ts";
import { getProfile } from "#lib/server/database/profiles.ts";
import { games } from "#lib/server/games.ts";
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

  const [profile, player, state] = await Promise.all([
    getProfile(session.user_id),
    getPlayer(gameId, session.user_id),
    game.getState(),
  ]);
  if (!profile) {
    error(404, "Profile not found");
  }
  if (!player) {
    error(404, "Player not found");
  }

  let unsubscribe: () => void;

  const stream = new ReadableStream({
    async start(controller) {
      unsubscribe = await game.subscribe((message) => {
        controller.enqueue(`data: ${JSON.stringify(message)}\n\n`);
      });

      const playerState = state.players[session.user_id];
      if (!playerState) {
        throw new Error("Player tried to join without being part of game.");
      }

      await game.join(session.user_id);
    },
    async cancel() {
      unsubscribe();

      await game.leave(session.user_id);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};
