import { getProfile } from "#lib/server/database/profiles.ts";
import { games } from "#lib/server/games.ts";
import type { RequestHandler } from "./$types";
import { error, redirect } from "@sveltejs/kit";

type RequestBody = {
  userId: string;
};

export const POST: RequestHandler = async ({ locals, params, request }) => {
  const { session } = locals;
  if (!session) {
    redirect(303, "/sign-in");
  }

  const { id: gameId } = params;
  const game = await games.get(gameId);
  if (!game) {
    error(404, "Game not found.");
  }

  const { userId }: RequestBody = await request.json();

  const profile = await getProfile(userId);
  if (!profile) {
    error(404, "User not found.");
  }

  await game.addPlayer({
    isGameMaster: false,
    userId: profile.user_id,
    username: profile.username,
    avatarUri: profile.avatar_uri,
    online: false,
  });

  return new Response(null, { status: 204 });
};
