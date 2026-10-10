import { error, redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { gamerooms } from "#lib/server/gamerooms.js";
import { ServerMessageType, type LevelLoaded } from "#lib/messages.js";
import { getUserLevel, type LevelData } from "#lib/server/database/levels.js";
import { files } from "#lib/server/files/index.js";

export const PUT: RequestHandler = async ({ locals, params, request }) => {
  const { session } = locals;
  if (!session) {
    redirect(303, "/sign-in");
  }

  const { id: gameId } = params;

  const player = await gamerooms.getGamePlayer(gameId, session.user_id);
  if (!player) {
    error(404, "Player not found.");
  }

  if (player.permissionLevel !== "game_master") {
    error(403, "Players may not load levels.");
  }

  const { levelId }: { levelId: string } = await request.json();
  const level = await getUserLevel(session.user_id, levelId);
  if (!level) {
    error(404, "Level not found.");
  }

  const file = files.file(level.uri);
  const exists = await file.exists();
  if (!exists) {
    error(404, "Level data not found.");
  }

  const data: LevelData = await file.json();
  await gamerooms.setGameLevelUri(gameId, level.uri);

  const message: LevelLoaded = {
    type: ServerMessageType.LevelLoaded,
    name: level.name,
    data,
  };
  await gamerooms.publish(gameId, message);

  return new Response(null, { status: 204 });
};
