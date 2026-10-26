import { error, ok, type Result } from "result";
import { MAXIMUM_DICE_AMOUNT, MAXIMUM_DIE, MINIMUM_DICE_AMOUNT, MINIMUM_DIE } from "./game";

export enum ExpressionType {
  Binary = 0,
  Function,
  Dice,
  Literal,
}

type BinaryExpression = {
  type: ExpressionType.Binary;
  operator: "+" | "-";
  lhs: Expression;
  rhs: Expression;
};

type FunctionExpression = {
  type: ExpressionType.Function;
  name: string;
  argument: Expression;
};

type DiceExpression = {
  type: ExpressionType.Dice;
  count: number;
  sides: number;
};

type LiteralExpression = {
  type: ExpressionType.Literal;
  value: number;
};

type Expression = BinaryExpression | FunctionExpression | DiceExpression | LiteralExpression;

type Evaluation = {
  total: number;
  rolls: number[];
};

export class DiceRoller {
  private _expression: Expression;
  private constructor(expression: Expression) {
    this._expression = expression;
  }

  get expression(): Expression {
    return this._expression;
  }

  /**
   * Traverse the string and convert it into a single expression.
   */
  static parse(s: string): Result<DiceRoller, string> {
    const expression = parseExpression(s);
    if (!expression.ok) {
      return expression;
    }
    return ok(new DiceRoller(expression.value));
  }

  evaluate(): Result<Evaluation, string> {
    return evaluateExpression(this._expression);
  }
}

function isWhiteSpace(s: string): boolean {
  switch (s) {
    case " ":
    case "/n":
    case "/r":
    case "/t":
    case "/f":
    case "/b":
      return true;
    default:
      return false;
  }
}

function isNumeric(s: string): boolean {
  const num = Number(s);
  return !isNaN(num);
}

function isAlphabet(s: string): boolean {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  return alphabet.includes(s.toLowerCase());
}

function isOperator(s: string): boolean {
  return "+-".includes(s);
}

function parseNumeric(
  s: string,
  cursor: number,
): Result<
  {
    expression: Expression;
    cursor: number;
  },
  string
> {
  let word = "";
  while (true) {
    const character = s.at(cursor);
    if (character === undefined) {
      break;
    }
    if (isWhiteSpace(character)) {
      break;
    }

    if (isNumeric(character)) {
      word += character;
      cursor++;
      continue;
    }

    if (character === "d") {
      if (word.includes("d")) {
        return error("Received more than one 'd'.");
      }

      word += character;
      cursor++;
      continue;
    }

    return error("Unexpected Character.");
  }

  if (word.includes("d")) {
    const [countStr, sidesStr] = word.split("d");
    const count = Number(countStr);
    if (isNaN(count) || count < MINIMUM_DICE_AMOUNT || count > MAXIMUM_DICE_AMOUNT) {
      return error("Received invalid dice.");
    }
    const sides = Number(sidesStr);
    if (isNaN(sides) || sides < MINIMUM_DIE || sides > MAXIMUM_DIE) {
      return error("Received invalid dice.");
    }

    return ok({
      expression: {
        type: ExpressionType.Dice,
        count: count,
        sides: sides,
      },
      cursor,
    });
  }

  return ok({
    expression: {
      type: ExpressionType.Literal,
      value: Number(word),
    },
    cursor,
  });
}

function parseAlphabet(
  s: string,
  cursor: number,
): Result<
  {
    expression: Expression;
    cursor: number;
  },
  string
> {
  let word = "";
  while (true) {
    const character = s.at(cursor);
    if (character === undefined) {
      break;
    }
    if (isWhiteSpace(character)) {
      break;
    }

    if (character === "(") {
      let innerWord = "";
      let parenCount = 0;
      cursor++;
      while (true) {
        const innerChar = s.at(cursor);
        if (innerChar === undefined) {
          break;
        }

        if (innerChar === ")" && parenCount === 0) {
          cursor++;
          break;
        }

        if (innerChar === "(") {
          parenCount++;
        }

        if (innerChar === ")") {
          parenCount--;
        }

        innerWord += innerChar;
        cursor++;
      }

      const argument = parseExpression(innerWord);
      if (!argument.ok) {
        return argument;
      }
      return ok({
        expression: {
          type: ExpressionType.Function,
          argument: argument.value,
          name: word,
        },
        cursor,
      });
    }

    word += character;
    cursor++;
  }

  const [countStr, sidesStr] = word.split("d");
  const count = Number(countStr);
  if (isNaN(count)) {
    return error("Received invalid dice.");
  }
  const sides = Number(sidesStr);
  if (isNaN(sides) || sides < MINIMUM_DIE) {
    return error("Received invalid dice.");
  }

  return ok({
    expression: {
      type: ExpressionType.Dice,
      count: Math.max(1, count),
      sides: sides,
    },
    cursor,
  });
}

function parseExpression(s: string): Result<Expression, string> {
  const expressions: Expression[] = [];
  let cursor = 0;
  while (true) {
    if (cursor >= s.length) {
      break;
    }

    const character = s.at(cursor);
    if (character === undefined) {
      break;
    }

    if (isWhiteSpace(character)) {
      cursor++;
      continue;
    }

    if (isNumeric(character)) {
      const result = parseNumeric(s, cursor);
      if (!result.ok) {
        return result;
      }
      const { expression, cursor: changedCursor } = result.value;
      expressions.push(expression);
      cursor = changedCursor;
      continue;
    }

    if (isAlphabet(character)) {
      const result = parseAlphabet(s, cursor);
      if (!result.ok) {
        return result;
      }
      const { expression, cursor: changedCursor } = result.value;
      expressions.push(expression);
      cursor = changedCursor;
      continue;
    }

    if (isOperator(character)) {
      const lhs = expressions.pop();
      if (lhs === undefined) {
        return error("Received operator before expression.");
      }
      const rhs = parseExpression(s.slice(cursor + 1));
      if (!rhs.ok) {
        return rhs;
      }
      cursor = s.length;
      expressions.push({
        type: ExpressionType.Binary,
        operator: character as "+" | "-",
        lhs,
        rhs: rhs.value,
      });
      continue;
    }

    return error("Unexpected character.");
  }

  if (expressions.length !== 1) {
    return error("Invalid expression.");
  }

  return ok(expressions[0]);
}

function advantage(expr: Expression): Result<Evaluation, string> {
  if (expr.type !== ExpressionType.Dice) {
    return error("Invalid expression.");
  }

  let total = 0;
  let rolls: number[] = [];
  for (let j = 0; j < expr.count; j++) {
    const result1 = Math.ceil(Math.random() * expr.sides);
    const result2 = Math.ceil(Math.random() * expr.sides);
    total += Math.max(result1, result2);
    rolls = rolls.concat([result1, result2]);
  }

  return ok({
    total,
    rolls,
  });
}

function disadvantage(expr: Expression): Result<Evaluation, string> {
  if (expr.type !== ExpressionType.Dice) {
    return error("Invalid expression.");
  }

  let total = 0;
  let rolls: number[] = [];
  for (let j = 0; j < expr.count; j++) {
    const result1 = Math.ceil(Math.random() * expr.sides);
    const result2 = Math.ceil(Math.random() * expr.sides);
    total += Math.min(result1, result2);
    rolls = rolls.concat([result1, result2]);
  }

  return ok({
    total,
    rolls,
  });
}

function dropLowest(expr: Expression): Result<Evaluation, string> {
  if (expr.type !== ExpressionType.Dice) {
    return error("Invalid expression.");
  }

  let rolls: number[] = [];
  for (let j = 0; j < expr.count; j++) {
    const result = Math.ceil(Math.random() * expr.sides);
    rolls.push(result);
  }

  rolls = rolls.sort().slice(0, -1);

  return ok({
    total: rolls.reduce((prev, curr) => prev + curr),
    rolls,
  });
}

function evaluateExpression(expr: Expression): Result<Evaluation, string> {
  switch (expr.type) {
    case ExpressionType.Literal:
      return ok({
        total: expr.value,
        rolls: [],
      });
    case ExpressionType.Dice: {
      let total = 0;
      const rolls = [];
      for (let j = 0; j < expr.count; j++) {
        const result = Math.ceil(Math.random() * expr.sides);
        total += result;
        rolls.push(result);
      }
      return ok({
        total,
        rolls,
      });
    }
    case ExpressionType.Binary: {
      const left = evaluateExpression(expr.lhs);
      if (!left.ok) {
        return left;
      }
      const right = evaluateExpression(expr.rhs);
      if (!right.ok) {
        return right;
      }
      return ok({
        total:
          expr.operator === "+"
            ? left.value.total + right.value.total
            : left.value.total - right.value.total,
        rolls: left.value.rolls.concat(right.value.rolls),
      });
    }
    case ExpressionType.Function:
      switch (expr.name) {
        case "advantage":
        case "adv":
          return advantage(expr.argument);
        case "disadvantage":
        case "dis":
          return disadvantage(expr.argument);
        case "drop-lowest":
        case "dl":
          return dropLowest(expr.argument);
        default:
          return error("Unknown function.");
      }
  }
}
