import { error, redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getProfile } from "#lib/server/database/profiles.js";
import { ServerMessageType, type PlayerLeft, type ServerMessage } from "#lib/messages.js";
import { getPlayer } from "#lib/server/database/players.js";
import { games, type GamePlayer } from "#lib/server/games.js";

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

  const gamePlayer = state.players[session.user_id];

  let unsubscribe: () => void;

  // TODO: this should just be game.join & game.leave
  const stream = new ReadableStream({
    async start(controller) {
      unsubscribe = await game.subscribe((message) => {
        controller.enqueue(`data: ${JSON.stringify(message)}\n\n`);
      });

      const playerState = state.players[session.user_id];
      if (!playerState) {
        throw new Error("Player tried to join without being part of game.");
      }

      await game.updatePlayer(session.user_id, true);
      const message: ServerMessage = {
        type: ServerMessageType.PlayerJoined,
        ...(gamePlayer as unknown as GamePlayer),
        userId: session.user_id,
      };

      await game.publish(message);
    },
    async cancel() {
      unsubscribe();

      await game.updatePlayer(session.user_id, false);

      const message: PlayerLeft = {
        type: ServerMessageType.PlayerLeft,
        userId: session.user_id,
      };
      await game.publish(message);
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
