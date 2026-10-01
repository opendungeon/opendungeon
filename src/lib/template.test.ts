import { describe, expect, test } from "vitest";
import Template from "$lib/template";

describe.concurrent("Template", () => {
  test("build literal", () => {
    const template = new Template("this is a basic string");
    const received = template.build({});
    expect(received).toBe("this is a basic string");
  });

  test("build variable", () => {
    const template = new Template("this is a {{ adjective }} string");
    const received = template.build({ adjective: "very cool" });
    expect(received).toBe("this is a very cool string");
  });

  test("build multi variable", () => {
    const template = new Template("this is a {{ adjective }} {{ noun }}");
    const received = template.build({ adjective: "very cool", noun: "template" });
    expect(received).toBe("this is a very cool template");
  });

  test("build if statement", () => {
    const template = new Template("this is a {% if isWorking %}very cool {% endif %}string");
    const received = template.build({ isWorking: true });
    expect(received).toBe("this is a very cool string");
  });

  test("build truthy if statement", () => {
    const template = new Template("this is a {% if isWorking %}very cool {% endif %}string");
    const received = template.build({ isWorking: 1 });
    expect(received).toBe("this is a very cool string");
  });

  test("build false if statement", () => {
    const template = new Template("this is a {% if isWorking %}very cool {% endif %}string");
    const received = template.build({ isWorking: false });
    expect(received).toBe("this is a string");
  });

  test("build falsy if statement", () => {
    const template = new Template("this is a {% if isWorking %}very cool {% endif %}string");
    const received = template.build({ isWorking: 0 });
    expect(received).toBe("this is a string");
  });

  test("build if else statement", () => {
    const template = new Template(
      "this is a {% if isWorking %}very cool {% else %}very bad {% endif %}string",
    );
    const received = template.build({ isWorking: false });
    expect(received).toBe("this is a very bad string");
  });

  test("build for statement", () => {
    const template = new Template("this is a {% for adjectives %}{{ value }} {% endfor %}string");
    const received = template.build({ adjectives: ["funny", "epic", "awesome"] });
    expect(received).toBe("this is a funny epic awesome string");
  });

  test("build contextual for statement", () => {
    const template = new Template(
      "this is a {% for adjectives %}{{strength}} {{adjective}} {% endfor %}string",
    );
    const received = template.build({
      adjectives: [
        { strength: "very", adjective: "funny" },
        { strength: "somewhat", adjective: "epic" },
        { strength: "mega", adjective: "awesome" },
      ],
    });
    expect(received).toBe("this is a very funny somewhat epic mega awesome string");
  });

  test("build indexed for statement", () => {
    const template = new Template(
      "i can count to{% for numbers %} {{ index }} {{ value }}{% endfor %}",
    );
    const received = template.build({ numbers: ["zero", "one", "two"] });
    expect(received).toBe("i can count to 0 zero 1 one 2 two");
  });

  test("build for range statement", () => {
    const template = new Template("i can count to{% for range 3 %} {{ index }}{% endfor %}");
    const received = template.build({ numbers: ["zero", "one", "two"] });
    expect(received).toBe("i can count to 0 1 2");
  });
});
