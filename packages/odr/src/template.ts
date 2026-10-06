import { error, ok, type Result } from "result";

type TemplateLiteralToken = { type: "literal"; value: string };
type TemplateVariableToken = { type: "variable"; key: string };

const STATEMENT_VARIANTS = ["if", "else", "endif", "for", "endfor"] as const;
type StatementVariant = (typeof STATEMENT_VARIANTS)[number];
type TemplateStatementToken = { type: "statement"; variant: StatementVariant; args: string[] };

type TemplateToken = TemplateLiteralToken | TemplateVariableToken | TemplateStatementToken;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TemplateBuildContext = Record<string, any>;

/**
 * A simple, barebones templating engine.
 *
 * @example
 * // returns "my awesome string"
 * Template.build("my {{ adjective }}string", { adjective: "awesome" });
 *
 * @example
 * // returns "my truthy string"
 * Template.build("my {% if isTruthy %}truthy {% endif %}string", { isTruthy: true });
 *
 * @example
 * // returns "my very well described string"
 * Template.build("my {% for words %}{{ value }} {% endfor %}string", { words: ["very", "well", "described"] });
 *
 * @example
 * // returns "my very funny somewhat epic mega awesome string"
 * Template.build("my {% for adjectives %}{{strength}} {{adjective}} {% endfor %}string", {
     adjectives: [
       { strength: "very", adjective: "funny" },
       { strength: "somewhat", adjective: "epic" },
       { strength: "mega", adjective: "awesome" },
     ],
 * });
 */
export default class Template {
  private constructor() {}

  static build(input: string, context: TemplateBuildContext): Result<string, string> {
    const tokens: TemplateToken[] = [];
    if (input.length === 0) {
      return ok("");
    }

    let cursor = 0;
    let value = "";
    while (cursor < input.length) {
      if (isVariableStart(input, cursor)) {
        // save the current literal
        tokens.push({ type: "literal", value });
        value = "";

        const result = tokenizeVariable(input, cursor);
        if (!result.ok) {
          return result;
        }

        const { variable, end } = result.value;
        tokens.push(variable);
        cursor = end;
        continue;
      }

      if (isStatementStart(input, cursor)) {
        // save the current literal
        tokens.push({ type: "literal", value });
        value = "";

        const result = tokenizeStatement(input, cursor);
        if (!result.ok) {
          return result;
        }

        const { statement, end } = result.value;
        tokens.push(statement);
        cursor = end;
        continue;
      }

      value += input[cursor];
      cursor += 1;
    }

    tokens.push({ type: "literal", value });
    return buildTokens(context, tokens);
  }
}

function isVariableStart(input: string, start: number): boolean {
  return input.slice(start, start + 2) == "{{";
}

function isStatementStart(input: string, start: number): boolean {
  return input.slice(start, start + 2) == "{%";
}

function tokenizeVariable(
  input: string,
  start: number,
): Result<{ variable: TemplateVariableToken; end: number }, string> {
  let cursor = start + 2;

  let key = "";
  while (input[cursor] !== "}" && input[cursor]) {
    key += input[cursor];
    cursor += 1;
  }
  if (!input[cursor]) {
    return error("Variable token ended unexpectedly.");
  }

  return ok({ variable: { type: "variable", key: key.trim() }, end: cursor + 2 });
}

function tokenizeStatement(
  input: string,
  start: number,
): Result<{ statement: TemplateStatementToken; end: number }, string> {
  let cursor = start + 2;

  let block = "";
  while (input[cursor] !== "%" && input[cursor]) {
    block += input[cursor];
    cursor += 1;
  }
  if (!input[cursor]) {
    return error("Statement token ended unexpectedly.");
  }

  const [variant, ...args] = block.split(" ").filter((word) => word.length);
  if (!STATEMENT_VARIANTS.includes(variant as StatementVariant)) {
    return error(`Unknown statement variant: ${variant}".`);
  }

  return ok({
    statement: { type: "statement", variant: variant as StatementVariant, args },
    end: cursor + 2,
  });
}

function buildTokens(
  context: TemplateBuildContext,
  tokens: TemplateToken[],
): Result<string, string> {
  let output = "";

  let cursor = 0;
  while (cursor < tokens.length) {
    const token = tokens[cursor]!;

    if (token.type === "literal") {
      output += token.value;
      cursor++;
      continue;
    }

    if (token.type === "variable") {
      const variable = context[token.key];
      if (variable === undefined) {
        return error(`Undefined variable "${token.key}".`);
      }

      output += variable.toString();
      cursor++;
      continue;
    }

    if (token.type === "statement") {
      const variant = token.variant;

      if (variant === "if") {
        const truthyBlockTokens: TemplateToken[] = [];
        const falsyBlockTokens: TemplateToken[] = [];
        cursor++;

        let hasEnteredElseBlock = false;
        while (!isEndIf(tokens[cursor]!) && tokens[cursor]) {
          if (isElse(tokens[cursor]!)) {
            hasEnteredElseBlock = true;
          } else if (!hasEnteredElseBlock) {
            truthyBlockTokens.push(tokens[cursor]!);
          } else {
            falsyBlockTokens.push(tokens[cursor]!);
          }
          cursor++;
        }
        if (!tokens[cursor]) {
          return error("If block ended unexpectedly.");
        }

        if (token.args[0] === undefined) {
          return error("If block missing required boolean expression.");
        }

        if (context[token.args[0]]) {
          const result = buildTokens(context, truthyBlockTokens);
          if (!result.ok) {
            return result;
          }

          output += result.value;
        } else {
          const result = buildTokens(context, falsyBlockTokens);
          if (!result.ok) {
            return result;
          }

          output += result.value;
        }

        cursor++;
        continue;
      }

      if (variant === "for") {
        const blockTokens: TemplateToken[] = [];
        cursor++;

        while (!isEndFor(tokens[cursor]!) && tokens[cursor]) {
          blockTokens.push(tokens[cursor]!);
          cursor++;
        }

        if (!tokens[cursor]) {
          return error("For block ended unexpectedly.");
        }

        if (token.args[0] === undefined) {
          return error("For block missing required range expression.");
        }

        // range loops
        if (token.args[0] === "range") {
          if (token.args[1] === undefined) {
            return error("For block missing required range integer value.");
          }

          const range = isNaN(Number(token.args[1]))
            ? Number(context[token.args[1]])
            : Number(token.args[1]);
          if (!Number.isInteger(range)) {
            return error("For range block requires an integer range value.");
          }

          for (let i = 0; i < range; i++) {
            const result = buildTokens({ ...context, index: i }, blockTokens);
            if (!result.ok) {
              return result;
            }

            output += result.value;
          }

          cursor++;
          continue;
        }

        // iterable loops
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subject = context[token.args[0]] as Iterable<any>;
        if (!isIterable(subject)) {
          return error("For loop argument must be iterable.");
        }

        let index = 0;
        for (const value of subject) {
          if (isObject(value)) {
            const result = buildTokens({ ...context, value, index, ...value }, blockTokens);
            if (!result.ok) {
              return result;
            }

            output += result.value;
          } else {
            const result = buildTokens({ ...context, value, index }, blockTokens);
            if (!result.ok) {
              return result;
            }

            output += result.value;
          }
          index++;
        }

        cursor++;
        continue;
      }
    }

    return error("Should never get to the end of the template loop.");
  }

  return ok(output);
}

function isElse(token: TemplateToken): boolean {
  if (token.type !== "statement") {
    return false;
  }

  return token.variant === "else";
}

function isEndIf(token: TemplateToken): boolean {
  if (token.type !== "statement") {
    return false;
  }

  return token.variant === "endif";
}

function isEndFor(token: TemplateToken): boolean {
  if (token.type !== "statement") {
    return false;
  }

  return token.variant === "endfor";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isIterable(value: any): boolean {
  return value !== null && typeof value[Symbol.iterator] === "function";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isObject(value: any): boolean {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
