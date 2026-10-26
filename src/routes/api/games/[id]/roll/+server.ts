import { error, redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { gamerooms } from "#lib/server/gamerooms.js";
import { ServerMessageType, type DiceRolled } from "#lib/messages.js";
import { DiceRoller } from "#lib/diceroller.js";

const ROLL_PREFIX = "/roll ";

export const POST: RequestHandler = async ({ locals, params, request }) => {
  const { session } = locals;
  if (!session) {
    redirect(303, "/sign-in");
  }

  const { id: gameId } = params;
  const { rollString }: { rollString: string } = await request.json();

  const [_, roll] = rollString.split(ROLL_PREFIX);
  if (!roll) {
    error(400, "Bad roll string.");
  }
  const result = DiceRoller.parse(roll);
  if (!result.ok) {
    error(400, result.error);
  }
  const evaluation = result.value.evaluate();
  if (!evaluation.ok) {
    error(400, evaluation.error);
  }

  const message: DiceRolled = {
    type: ServerMessageType.DiceRolled,
    userId: session.user_id,
    ...evaluation.value,
  };
  await gamerooms.publish(gameId, message);

  return new Response(null, { status: 204 });
};
