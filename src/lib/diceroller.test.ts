import { describe, expect, test } from "vitest";
import { DiceRoller, ExpressionType } from "./diceroller";
import { unwrap } from "result";

describe.concurrent("DiceRoller", () => {
  test("parses literal", () => {
    const roller = unwrap(DiceRoller.parse("2"));
    expect(roller.expression).toEqual({ type: ExpressionType.Literal, value: 2 });
  });
  test("parses dice", () => {
    const roller = unwrap(DiceRoller.parse("1d4"));
    expect(roller.expression).toEqual({ type: ExpressionType.Dice, count: 1, sides: 4 });
  });
  test("parses function", () => {
    const roller = unwrap(DiceRoller.parse("square(2)"));
    expect(roller.expression).toEqual({
      type: ExpressionType.Function,
      name: "square",
      argument: {
        type: ExpressionType.Literal,
        value: 2,
      },
    });
  });
  test("parses function nested", () => {
    const roller = unwrap(DiceRoller.parse("square(square(2))"));
    expect(roller.expression).toEqual({
      type: ExpressionType.Function,
      name: "square",
      argument: {
        type: ExpressionType.Function,
        name: "square",
        argument: {
          type: ExpressionType.Literal,
          value: 2,
        },
      },
    });
  });
  test("parses operator", () => {
    const roller = unwrap(DiceRoller.parse("1 + 1"));
    expect(roller.expression).toEqual({
      type: ExpressionType.Binary,
      operator: "+",
      lhs: {
        type: ExpressionType.Literal,
        value: 1,
      },
      rhs: {
        type: ExpressionType.Literal,
        value: 1,
      },
    });
  });
  test("parses complex", () => {
    const roller = unwrap(DiceRoller.parse("adv(3d6 + 1d20) - 5 + square(adv(1d20))"));
    expect(roller.expression).toEqual({
      type: ExpressionType.Binary,
      operator: "-",
      lhs: {
        type: ExpressionType.Function,
        name: "adv",
        argument: {
          type: ExpressionType.Binary,
          operator: "+",
          lhs: {
            type: ExpressionType.Dice,
            count: 3,
            sides: 6,
          },
          rhs: {
            type: ExpressionType.Dice,
            count: 1,
            sides: 20,
          },
        },
      },
      rhs: {
        type: ExpressionType.Binary,
        operator: "+",
        lhs: {
          type: ExpressionType.Literal,
          value: 5,
        },
        rhs: {
          type: ExpressionType.Function,
          name: "square",
          argument: {
            type: ExpressionType.Function,
            name: "adv",
            argument: {
              type: ExpressionType.Dice,
              count: 1,
              sides: 20,
            },
          },
        },
      },
    });
  });
});
