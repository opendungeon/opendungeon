import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as live from "$lib/server/live";
import { getProfile } from "$lib/server/database/profiles";
import { ServerMessageType, type PlayerJoined, type PlayerLeft } from "$lib/messages";
import { getPlayer } from "$lib/server/database/players";

export const GET: RequestHandler = async ({ locals, params }) => {
  const { session } = locals;
  if (!session) {
    redirect(303, "/sign-in");
  }

  const { id: gameId } = params;

  let shouldClose = false;

  const stream = new ReadableStream({
    async start(controller) {
      live.listen(gameId, (message, close) => {
        if (shouldClose) {
          close();
          return;
        }
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

      await live.addPlayer(gameId, {
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
      await live.notify(gameId, message);
    },
    async cancel() {
      shouldClose = true;

      await live.removePlayer(gameId, session.user_id);

      const message: PlayerLeft = {
        type: ServerMessageType.PlayerLeft,
        userId: session.user_id,
      };
      await live.notify(gameId, message);
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
