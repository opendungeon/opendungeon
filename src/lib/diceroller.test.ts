import { describe, expect, test } from "vitest";
import { DiceRoller, ExpressionType, type Evaluation } from "./diceroller";
import { unwrap } from "result";

describe.concurrent("DiceRoller", () => {
  test("parses literal", () => {
    const roller = unwrap(DiceRoller.parse("2"));
    expect(roller.expression).toEqual({ type: ExpressionType.Literal, value: 2 });
  });

  test("parses one die", () => {
    const roller = unwrap(DiceRoller.parse("d20"));
    expect(roller.expression).toEqual({ type: ExpressionType.Dice, count: 1, sides: 20 });
  });

  test("parses dice", () => {
    const roller = unwrap(DiceRoller.parse("3d4"));
    expect(roller.expression).toEqual({ type: ExpressionType.Dice, count: 3, sides: 4 });
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

  test("evaluates literal", () => {
    const parsed = DiceRoller.parse("5");
    expect(parsed.ok).toEqual(true);
    const evaluation = (
      parsed as {
        ok: true;
        value: DiceRoller;
      }
    ).value.evaluate();
    expect(evaluation.ok).toBe(true);
    const result = (
      evaluation as {
        ok: true;
        value: Evaluation;
      }
    ).value;
    expect(result.total).toBe(5);
    expect(result.rolls.length).toBe(0);
  });

  test("evaluates one die", () => {
    const parsed = DiceRoller.parse("d20");
    expect(parsed.ok).toEqual(true);
    const evaluation = (
      parsed as {
        ok: true;
        value: DiceRoller;
      }
    ).value.evaluate();
    expect(evaluation.ok).toBe(true);
    const result = (
      evaluation as {
        ok: true;
        value: Evaluation;
      }
    ).value;
    expect(result.total).toBeGreaterThanOrEqual(1);
    expect(result.total).toBeLessThanOrEqual(20);
    expect(result.rolls.length).toBe(1);
  });

  test("evaluates dice", () => {
    const parsed = DiceRoller.parse("3d6");
    expect(parsed.ok).toEqual(true);
    const evaluation = (
      parsed as {
        ok: true;
        value: DiceRoller;
      }
    ).value.evaluate();
    expect(evaluation.ok).toBe(true);
    const result = (
      evaluation as {
        ok: true;
        value: Evaluation;
      }
    ).value;
    expect(result.total).toBeGreaterThanOrEqual(3);
    expect(result.total).toBeLessThanOrEqual(18);
    expect(result.rolls.length).toBe(3);
  });

  test("evaluates binary", () => {
    const parsed = DiceRoller.parse("2 + 2");
    expect(parsed.ok).toBe(true);
    const evaluation = (
      parsed as {
        ok: true;
        value: DiceRoller;
      }
    ).value.evaluate();
    expect(evaluation.ok).toBe(true);
    const result = (
      evaluation as {
        ok: true;
        value: Evaluation;
      }
    ).value;
    expect(result.total).toBe(4);
    expect(result.rolls.length).toBe(0);
  });

  test("evaluates function", () => {
    const parsed = DiceRoller.parse("advantage(1d20)");
    expect(parsed.ok).toBe(true);
    const evaluation = (
      parsed as {
        ok: true;
        value: DiceRoller;
      }
    ).value.evaluate();
    expect(evaluation.ok).toBe(true);
    const result = (
      evaluation as {
        ok: true;
        value: Evaluation;
      }
    ).value;
    expect(result.total).toBeGreaterThanOrEqual(1);
    expect(result.total).toBeLessThanOrEqual(20);
    expect(result.rolls.length).toBe(2);
  });

  test("evaluates complex binary", () => {
    const parsed = DiceRoller.parse("advantage(1d20) + 3d6 - 5");
    expect(parsed.ok).toBe(true);
    const evaluation = (
      parsed as {
        ok: true;
        value: DiceRoller;
      }
    ).value.evaluate();
    expect(evaluation.ok).toBe(true);
    const result = (
      evaluation as {
        ok: true;
        value: Evaluation;
      }
    ).value;
    expect(result.total).toBeGreaterThanOrEqual(4);
    expect(result.total).toBeLessThanOrEqual(38);
    expect(result.rolls.length).toBe(5);
  });

  test("evaluates drop lowest", () => {
    const parsed = DiceRoller.parse("dl(4d6)");
    expect(parsed.ok).toBe(true);
    const evaluation = (
      parsed as {
        ok: true;
        value: DiceRoller;
      }
    ).value.evaluate();
    expect(evaluation.ok).toBe(true);
    const result = (
      evaluation as {
        ok: true;
        value: Evaluation;
      }
    ).value;
    expect(result.total).toBeGreaterThanOrEqual(3);
    expect(result.total).toBeLessThanOrEqual(18);
    expect(result.rolls.length).toBe(3);
  });
});
