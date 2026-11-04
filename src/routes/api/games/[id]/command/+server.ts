import { DiceRoller } from "#lib/diceroller.ts";
import { games } from "#lib/server/games/registry.ts";
import type { RequestHandler } from "./$types";
import { error, redirect } from "@sveltejs/kit";

type RequestBody = {
  command: string;
  args: string[];
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

  const { command, args }: RequestBody = await request.json();

  switch (command) {
    case "roll": {
      const result = DiceRoller.parse(args.join(" "));
      if (!result.ok) {
        error(400, "Invalid roll.");
      }

      const { expression } = result.value;
      game.roll(session.user_id, expression);
      break;
    }
    default:
      error(400, "Invalid command.");
  }

  return new Response(null, { status: 204 });
};
