import { error, redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { games } from "#lib/server/games.js";
import { PLAYER_COLORS, type PlayerColor } from "#lib/colors.js";
import { getProfile } from "#lib/server/database/profiles.js";

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

  const { userId }: { userId: string } = await request.json();

  const profile = await getProfile(userId);
  if (!profile) {
    error(404, "User not found.");
  }

  const state = await game.getState();
  const availableColors = new Set(PLAYER_COLORS).difference(
    new Set(
      Object.values(state.players).map((player) => {
        if (player.isGameMaster) {
          return undefined;
        }

        return (player as unknown as { color: PlayerColor }).color;
      }),
    ),
  );
  const color = Array.from(availableColors).at(0);
  if (!color) {
    error(409, "No colors available.");
  }

  await game.addPlayer({
    isGameMaster: false,
    userId: profile.user_id,
    username: profile.username,
    avatarUri: profile.avatar_uri,
    online: false,
    color,
  });

  return new Response(null, { status: 204 });
};
