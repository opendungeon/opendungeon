import { describe, expect, test } from "bun:test";
import Template from "./template.js";

describe.concurrent("Template", () => {
  const cases = [
    ["build literal", "this is a basic string", {}, "this is a basic string"],
    [
      "build variable",
      "this is a {{ adjective }} string",
      { adjective: "very cool" },
      "this is a very cool string",
    ],
    [
      "build multi variable",
      "this is a {{ adjective }} {{ noun }}",
      { adjective: "very cool", noun: "template" },
      "this is a very cool template",
    ],
    [
      "build if statement",
      "this is a {% if isWorking %}very cool {% endif %}string",
      { isWorking: true },
      "this is a very cool string",
    ],
    [
      "build truthy if statement",
      "this is a {% if isWorking %}very cool {% endif %}string",
      { isWorking: 1 },
      "this is a very cool string",
    ],
    [
      "build false if statement",
      "this is a {% if isWorking %}very cool {% endif %}string",
      { isWorking: false },
      "this is a string",
    ],
    [
      "build falsy if statement",
      "this is a {% if isWorking %}very cool {% endif %}string",
      { isWorking: 0 },
      "this is a string",
    ],
    [
      "build if else statement",
      "this is a {% if isWorking %}very cool {% else %}very bad {% endif %}string",
      { isWorking: false },
      "this is a very bad string",
    ],
    [
      "build for statement",
      "this is a {% for adjectives %}{{ value }} {% endfor %}string",
      { adjectives: ["funny", "epic", "awesome"] },
      "this is a funny epic awesome string",
    ],
    [
      "build contextual for statement",
      "this is a {% for adjectives %}{{strength}} {{adjective}} {% endfor %}string",
      {
        adjectives: [
          { strength: "very", adjective: "funny" },
          { strength: "somewhat", adjective: "epic" },
          { strength: "mega", adjective: "awesome" },
        ],
      },
      "this is a very funny somewhat epic mega awesome string",
    ],
    [
      "build indexed for statement",
      "i can count to{% for numbers %} {{ index }} {{ value }}{% endfor %}",
      { numbers: ["zero", "one", "two"] },
      "i can count to 0 zero 1 one 2 two",
    ],
    [
      "build for range statement",
      "i can count to{% for range 3 %} {{ index }}{% endfor %}",
      { numbers: ["zero", "one", "two"] },
      "i can count to 0 1 2",
    ],
  ] as const;

  for (const [name, inputStr, inputCtx, expectedOutput] of cases) {
    test(name, () => {
      const receivedOutput = Template.build(inputStr, inputCtx);
      expect(receivedOutput.ok).toBeTrue();
      if (receivedOutput.ok) {
        expect(receivedOutput.value).toBe(expectedOutput);
      }
    });
  }
});
