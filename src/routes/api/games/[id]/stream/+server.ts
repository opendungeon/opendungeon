import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { gamerooms } from "#lib/server/gamerooms.js";
import { getProfile } from "#lib/server/database/profiles.js";
import { ServerMessageType, type PlayerJoined, type PlayerLeft } from "#lib/messages.js";
import { getPlayer } from "#lib/server/database/players.js";

export const GET: RequestHandler = async ({ locals, params }) => {
  const { session } = locals;
  if (!session) {
    redirect(303, "/sign-in");
  }

  const { id: gameId } = params;

  let unsubscribe: () => void;

  const stream = new ReadableStream({
    async start(controller) {
      unsubscribe = await gamerooms.subscribe(gameId, (message) => {
        controller.enqueue(`data: ${JSON.stringify(message)}\n\n`);
      });

      const [profile, player] = await Promise.all([
        getProfile(session.user_id),
        getPlayer(gameId, session.user_id),
      ]);
      if (!profile) {
        throw new Error("Profile not found.");
      }
      if (!player) {
        throw new Error("Player not found.");
      }

      await gamerooms.addGamePlayer(gameId, {
        userId: profile.user_id,
        username: profile.username,
        avatarUri: profile.avatar_uri,
        permissionLevel: player.permission_level,
      });

      const message: PlayerJoined = {
        type: ServerMessageType.PlayerJoined,
        userId: profile.user_id,
        username: profile.username,
        avatarUri: profile.avatar_uri,
        permissionLevel: player.permission_level,
      };
      await gamerooms.publish(gameId, message);
    },
    async cancel() {
      unsubscribe();
      await gamerooms.deleteGamePlayer(gameId, session.user_id);

      const message: PlayerLeft = {
        type: ServerMessageType.PlayerLeft,
        userId: session.user_id,
      };
      await gamerooms.publish(gameId, message);
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
