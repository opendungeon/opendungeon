import assert from "$lib/assert";

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
 * new Template("my {{ adjective }}string").build({ adjective: "awesome" });
 *
 * @example
 * // returns "my truthy string"
 * new Template("my {% if isTruthy %}truthy {% endif %}string").build({ isTruthy: true });
 *
 * @example
 * // returns "my very well described string"
 * new Template("my {% for words %}{{ value }} {% endfor %}string")
 *   .build({ words: ["very", "well", "described"] });
 *
 * @example
 * // returns "my very funny somewhat epic mega awesome string"
 * new Template("my {% for adjectives %}{{strength}} {{adjective}} {% endfor %}string")
 *   .build({
        adjectives: [
          { strength: "very", adjective: "funny" },
          { strength: "somewhat", adjective: "epic" },
          { strength: "mega", adjective: "awesome" },
        ],
 *   });
 */
export default class Template {
  private tokens: TemplateToken[];

  constructor(input: string) {
    this.tokens = [];
    if (input.length === 0) {
      return;
    }

    let cursor = 0;
    let value = "";
    while (cursor < input.length) {
      if (isVariableStart(input, cursor)) {
        // save the current literal
        this.tokens.push({ type: "literal", value });
        value = "";

        const { variable, end } = tokenizeVariable(input, cursor);
        this.tokens.push(variable);
        cursor = end;
        continue;
      }

      if (isStatementStart(input, cursor)) {
        // save the current literal
        this.tokens.push({ type: "literal", value });
        value = "";

        const { statement, end } = tokenizeStatement(input, cursor);
        this.tokens.push(statement);
        cursor = end;
        continue;
      }

      value += input[cursor];
      cursor += 1;
    }

    this.tokens.push({ type: "literal", value });
  }

  build(context: TemplateBuildContext): string {
    return buildTokens(context, this.tokens);
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
): { variable: TemplateVariableToken; end: number } {
  let cursor = start + 2;

  let key = "";
  while (input[cursor] !== "}" && input[cursor]) {
    key += input[cursor];
    cursor += 1;
  }
  assert(!!input[cursor], "variable token ended unexpectedly");

  return { variable: { type: "variable", key: key.trim() }, end: cursor + 2 };
}

function tokenizeStatement(
  input: string,
  start: number,
): { statement: TemplateStatementToken; end: number } {
  let cursor = start + 2;

  let block = "";
  while (input[cursor] !== "%" && input[cursor]) {
    block += input[cursor];
    cursor += 1;
  }
  assert(!!input[cursor], "statement token ended unexpectedly");

  const [variant, ...args] = block.split(" ").filter((word) => word.length);
  assert(
    STATEMENT_VARIANTS.includes(variant as StatementVariant),
    `unknown statement variant: ${variant}`,
  );

  return {
    statement: { type: "statement", variant: variant as StatementVariant, args },
    end: cursor + 2,
  };
}

function buildTokens(context: TemplateBuildContext, tokens: TemplateToken[]) {
  let output = "";

  let cursor = 0;
  while (cursor < tokens.length) {
    const token = tokens[cursor];

    if (token.type === "literal") {
      output += token.value;
      cursor++;
      continue;
    }

    if (token.type === "variable") {
      const variable = context[token.key];
      assert(variable !== undefined, `undefined variable "${token.key}"`);
      output += variable.toString();
      cursor++;
      continue;
    }

    if (token.type === "statement") {
      const variant = token.variant;

      if (variant === "if") {
        const truthyBlockTokens = [];
        const falsyBlockTokens = [];
        cursor++;

        let hasEnteredElseBlock = false;
        while (!isEndIf(tokens[cursor]) && tokens[cursor]) {
          if (isElse(tokens[cursor])) {
            hasEnteredElseBlock = true;
          } else if (!hasEnteredElseBlock) {
            truthyBlockTokens.push(tokens[cursor]);
          } else {
            falsyBlockTokens.push(tokens[cursor]);
          }
          cursor++;
        }
        assert(!!tokens[cursor], "if block ended unexpectedly");

        if (context[token.args[0]]) {
          output += buildTokens(context, truthyBlockTokens);
        } else {
          output += buildTokens(context, falsyBlockTokens);
        }

        cursor++;
        continue;
      }

      if (variant === "for") {
        const blockTokens = [];
        cursor++;

        while (!isEndFor(tokens[cursor]) && tokens[cursor]) {
          blockTokens.push(tokens[cursor]);
          cursor++;
        }
        assert(!!tokens[cursor], "for block ended unexpectedly");

        // range loops
        if (token.args[0] === "range") {
          const range = isNaN(Number(token.args[1]))
            ? Number(context[token.args[1]])
            : Number(token.args[1]);
          assert(
            Number.isInteger(range),
            `range argument must be an integer, received ${token.args[1]}`,
          );

          for (let i = 0; i < range; i++) {
            output += buildTokens({ ...context, index: i }, blockTokens);
          }

          cursor++;
          continue;
        }

        // iterable loops
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subject = context[token.args[0]] as Iterable<any>;
        assert(isIterable(subject), "loop argument must be iterable");

        let index = 0;
        for (const value of subject) {
          if (isObject(value)) {
            output += buildTokens({ ...context, value, index, ...value }, blockTokens);
          } else {
            output += buildTokens({ ...context, value, index }, blockTokens);
          }
          index++;
        }

        cursor++;
        continue;
      }
    }

    assert(false, "should never get to the end of this loop");
  }

  return output;
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
