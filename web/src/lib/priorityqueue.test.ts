import { describe, expect, test } from "vitest";
import { PriorityQueue } from "./priorityqueue";

describe.concurrent("PriorityQueue", () => {
  test("new queue is empty", () => {
    const pq = new PriorityQueue<number>();
    expect(pq.isEmpty).toBe(true);
    expect(pq.length).toBe(0);
  });

  test("pop on empty queue returns null", () => {
    const pq = new PriorityQueue<string>();
    expect(pq.pop()).toBeNull();
  });

  test("push and pop a single element", () => {
    const pq = new PriorityQueue<string>();
    pq.push("a", 1);

    expect(pq.isEmpty).toBe(false);
    expect(pq.length).toBe(1);
    expect(pq.pop()).toBe("a");
    expect(pq.isEmpty).toBe(true);
  });

  test("pops elements in priority order (lowest first)", () => {
    const pq = new PriorityQueue<string>();
    pq.push("low", 10);
    pq.push("high", 1);
    pq.push("mid", 5);

    expect(pq.pop()).toBe("high");
    expect(pq.pop()).toBe("mid");
    expect(pq.pop()).toBe("low");
    expect(pq.pop()).toBeNull();
  });

  test("length decreases after each pop", () => {
    const pq = new PriorityQueue<number>();
    pq.push(1, 3);
    pq.push(2, 1);
    pq.push(3, 2);

    expect(pq.length).toBe(3);
    pq.pop();
    expect(pq.length).toBe(2);
    pq.pop();
    expect(pq.length).toBe(1);
    pq.pop();
    expect(pq.length).toBe(0);
  });

  test("handles duplicate priorities", () => {
    const pq = new PriorityQueue<string>();
    pq.push("a", 1);
    pq.push("b", 1);
    pq.push("c", 1);

    const results = [pq.pop(), pq.pop(), pq.pop()];
    expect(results).toHaveLength(3);
    expect(new Set(results)).toEqual(new Set(["a", "b", "c"]));
    expect(pq.isEmpty).toBe(true);
  });

  test("handles negative priorities", () => {
    const pq = new PriorityQueue<string>();
    pq.push("pos", 5);
    pq.push("neg", -3);
    pq.push("zero", 0);

    expect(pq.pop()).toBe("neg");
    expect(pq.pop()).toBe("zero");
    expect(pq.pop()).toBe("pos");
  });

  test("works with many elements inserted in ascending order", () => {
    const pq = new PriorityQueue<number>();
    for (let i = 0; i < 100; i++) {
      pq.push(i, i);
    }

    for (let i = 0; i < 100; i++) {
      expect(pq.pop()).toBe(i);
    }
    expect(pq.isEmpty).toBe(true);
  });

  test("works with many elements inserted in descending order", () => {
    const pq = new PriorityQueue<number>();
    for (let i = 99; i >= 0; i--) {
      pq.push(i, i);
    }

    for (let i = 0; i < 100; i++) {
      expect(pq.pop()).toBe(i);
    }
    expect(pq.isEmpty).toBe(true);
  });

  test("interleaved push and pop", () => {
    const pq = new PriorityQueue<string>();

    pq.push("c", 3);
    pq.push("a", 1);
    expect(pq.pop()).toBe("a");

    pq.push("b", 2);
    expect(pq.pop()).toBe("b");
    expect(pq.pop()).toBe("c");
    expect(pq.pop()).toBeNull();
  });

  test("works with object values", () => {
    const pq = new PriorityQueue<{ x: number; y: number }>();
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 1, y: 1 };
    const p3 = { x: 2, y: 2 };

    pq.push(p2, 5);
    pq.push(p1, 1);
    pq.push(p3, 10);

    expect(pq.pop()).toBe(p1);
    expect(pq.pop()).toBe(p2);
    expect(pq.pop()).toBe(p3);
  });
});
