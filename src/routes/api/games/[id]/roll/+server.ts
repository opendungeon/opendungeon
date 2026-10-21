import { error, redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { gamerooms } from "#lib/server/gamerooms.js";
import { ServerMessageType, type DiceRolled } from "#lib/messages.js";
import {
  RollType,
  MINIMUM_DICE_AMOUNT,
  MAXIMUM_DICE_AMOUNT,
  MINIMUM_DIE,
  MAXIMUM_DIE,
} from "#lib/game/index.js";

const ROLL_PREFIX = "/roll ";

export const POST: RequestHandler = async ({ locals, params, request }) => {
  const { session } = locals;
  if (!session) {
    redirect(303, "/sign-in");
  }

  const { id: gameId } = params;
  let { rollString }: { rollString: string } = await request.json();

  if (!rollString.startsWith(ROLL_PREFIX)) {
    error(400, "Bad roll string");
  }

  rollString = rollString.slice(ROLL_PREFIX.length);
  const parts: string[] = rollString.match(/[a-z][a-z-]*\([^)]*\)|\d*d\d+|\d+|[+-]/gi) ?? [];
  let total = 0;
  const allRolls = [];
  const modifiers = [];
  for (let i = 0; i < parts.length; i++) {
    const roll = parts[i];
    if (roll === "+" || roll === "-") {
      if (i === 0) {
        error(400, "Bad roll string");
      }
      continue;
    }
    const shouldSubtract = i > 0 && parts[i - 1] === "-";
    let modifier = Number(roll);
    if (!Number.isNaN(modifier)) {
      if (modifier > MAXIMUM_DIE) {
        error(400, "Invalid modifier");
      }
      modifier = shouldSubtract ? -1 * modifier : modifier;
      modifiers.push(modifier);
      total += modifier;
      continue;
    }

    let rolls: {
      roll: number;
      shouldSubtract: boolean;
    }[] = [];
    const rollType = Object.values(RollType).find((type) => roll.includes(type)) ?? false;
    if (rollType && roll.match(/\(.*\)/)) {
      const args = roll
        .slice(rollType.length + 1, -1)
        .split(",")
        .map((arg) => arg.trim());
      if (args.length > 2 || !args[0].match(/^[0-9]*d[0-9]*$/)) {
        error(400, "Bad roll string");
      }

      const [amount, die] = args[0].split("d").map((str) => {
        if (str === "") {
          return 1;
        } else {
          return Number(str);
        }
      });
      if (
        die < MINIMUM_DIE ||
        die > MAXIMUM_DIE ||
        amount < MINIMUM_DICE_AMOUNT ||
        amount > MAXIMUM_DICE_AMOUNT
      ) {
        error(400, "Invalid die or dice amount");
      }

      const dropHighLowAmount: number | null = [RollType.DropHigh, RollType.DropLow].includes(
        rollType,
      )
        ? Number(args[1])
        : null;
      if (
        dropHighLowAmount !== null &&
        (Number.isNaN(dropHighLowAmount) || dropHighLowAmount < 1 || dropHighLowAmount >= amount)
      ) {
        error(400, "Invalid argument");
      }

      for (let j = 0; j < amount; j++) {
        const result = Math.ceil(Math.random() * die);
        const result2 = Math.ceil(Math.random() * die);
        switch (rollType) {
          case RollType.Advantage:
            rolls.push({ roll: Math.max(result, result2), shouldSubtract });
            allRolls.push(result, result2);
            break;
          case RollType.Disadvantage:
            rolls.push({ roll: Math.min(result, result2), shouldSubtract });
            allRolls.push(result, result2);
            break;
          default:
            rolls.push({ roll: result, shouldSubtract });
            allRolls.push(result);
        }
      }

      if (rollType === RollType.DropLow) {
        rolls = rolls.sort((a, b) => b.roll - a.roll).slice(0, rolls.length - dropHighLowAmount!);
      } else if (rollType === RollType.DropHigh) {
        rolls = rolls.sort((a, b) => a.roll - b.roll).slice(0, rolls.length - dropHighLowAmount!);
      }

      total += rolls.reduce(
        (prev, curr) => prev + (curr.shouldSubtract ? -curr.roll : curr.roll),
        0,
      );
    } else if (roll.match(/^[0-9]*d[0-9]*$/)) {
      const [amount, die] = roll.split("d").map((str) => {
        if (str === "") {
          return 1;
        } else {
          return Number(str);
        }
      });
      if (
        die < MINIMUM_DIE ||
        die > MAXIMUM_DIE ||
        amount < MINIMUM_DICE_AMOUNT ||
        amount > MAXIMUM_DICE_AMOUNT
      ) {
        error(400, "Invalid die or dice amount");
      }

      for (let j = 0; j < amount; j++) {
        const result = Math.ceil(Math.random() * die);
        allRolls.push(result);
        total += shouldSubtract ? -result : result;
      }
    } else {
      error(400, "Bad roll string");
    }
  }

  if (allRolls.length === 0) {
    error(400, "No dice specified");
  }

  const message: DiceRolled = {
    type: ServerMessageType.DiceRolled,
    userId: session.user_id,
    total,
    rolls: allRolls,
    modifiers,
  };
  await gamerooms.publish(gameId, message);

  return new Response(null, { status: 204 });
};
