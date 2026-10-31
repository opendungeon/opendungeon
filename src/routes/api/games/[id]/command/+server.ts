import { error, redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { games } from "#lib/server/games.js";
import { ServerMessageType, type DiceRolled } from "#lib/messages.js";
import { DiceRoller, type Evaluation } from "#lib/diceroller.js";
import { Command } from "#lib/game/index.js";

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

  const { command, args }: { command: string; args: string } = await request.json();

  if (!args) {
    error(400, "Invalid arguments.");
  }

  switch (command) {
    case Command.Roll: {
      const evaluation = evaluateRoll(args);

      const message: DiceRolled = {
        type: ServerMessageType.DiceRolled,
        userId: session.user_id,
        ...evaluation,
      };

      await game.publish(message);
      break;
    }
    case Command.PrivateRoll: {
      const evaluation = evaluateRoll(args);

      const message: DiceRolled = {
        type: ServerMessageType.DiceRolled,
        userId: session.user_id,
        ...evaluation,
      };

      // TODO: Share roll with GM via "private" redis channel
      return new Response(JSON.stringify(message), {
        headers: { "Content-Type": "application/json" },
      });
    }
    default:
      error(400, "Invalid command.");
  }

  return new Response(null, { status: 204 });
};

function evaluateRoll(rollStr: string): Evaluation {
  const result = DiceRoller.parse(rollStr);
  if (!result.ok) {
    error(400, result.error);
  }

  const evaluation = result.value.evaluate();
  if (!evaluation.ok) {
    error(400, evaluation.error);
  }

  return evaluation.value;
}
