import { describe, expect, test } from "vitest";
import { HexGrid } from "./grid";
import { Point } from "./point";

describe.concurrent("HexGrid", () => {
  describe("getCell", () => {
    test("gets existing cell", () => {
      const grid = new HexGrid(7, 7);

      (
        [
          [0, 0],
          [6, 0],
          [-3, 6],
          [3, 6],
        ] as const
      ).forEach(([q, r]) => {
        const cell = grid.getCell(q, r);
        expect(cell).not.toBeNull();
        expect(cell).toStrictEqual({ q, r, weight: 1 });
      });
    });

    test("get out of bounds", () => {
      const grid = new HexGrid(7, 7);
      (
        [
          [-1, 0],
          [7, 0],
          [-4, 6],
          [-3, 7],
          [4, 6],
          [4, 7],
        ] as const
      ).forEach(([q, r]) => {
        const cell = grid.getCell(q, r);
        expect(cell).toBeNull();
      });
    });
  });

  describe("toString", () => {
    test("square", () => {
      const grid = new HexGrid(10, 10);

      expect(grid.toString()).toBe(`⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡
 ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡
⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡
 ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡
⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡
 ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡
⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡
 ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡
⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡
 ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡`);
    });

    test("rectangle", () => {
      const grid = new HexGrid(5, 10);

      expect(grid.toString()).toBe(`⬡ ⬡ ⬡ ⬡ ⬡
 ⬡ ⬡ ⬡ ⬡ ⬡
⬡ ⬡ ⬡ ⬡ ⬡
 ⬡ ⬡ ⬡ ⬡ ⬡
⬡ ⬡ ⬡ ⬡ ⬡
 ⬡ ⬡ ⬡ ⬡ ⬡
⬡ ⬡ ⬡ ⬡ ⬡
 ⬡ ⬡ ⬡ ⬡ ⬡
⬡ ⬡ ⬡ ⬡ ⬡
 ⬡ ⬡ ⬡ ⬡ ⬡`);
    });
  });

  describe("calcDistance", () => {
    test("straight horizontal", () => {
      const grid = new HexGrid(10, 10);
      const distance = grid.calcDistance(0, 0, 9, 0);
      expect(distance).toBe(9);
    });

    test("straight diagonal", () => {
      const grid = new HexGrid(10, 10);
      const distance = grid.calcDistance(0, 0, 5, 9);
      expect(distance).toBe(14);
    });
  });

  describe("getShortestPath", () => {
    test("straight", () => {
      const grid = new HexGrid(5, 5);

      const path = grid.getShortestPath(new Point(0, 0), new Point(2, 4));
      expect(path[0]).toStrictEqual(new Point(0, 1));
      expect(path[1]).toStrictEqual(new Point(1, 1));
      expect(path[2]).toStrictEqual(new Point(2, 1));
      expect(path[3]).toStrictEqual(new Point(2, 2));
      expect(path[4]).toStrictEqual(new Point(2, 3));
      expect(path[5]).toStrictEqual(new Point(2, 4));
    });

    test("obstructed simple", () => {
      const grid = new HexGrid(5, 5);
      grid.setCell(2, 0, 0);

      const path = grid.getShortestPath(new Point(0, 0), new Point(2, 4));
      expect(path[0]).toStrictEqual(new Point(1, 0));
      expect(path[1]).toStrictEqual(new Point(1, 1));
      expect(path[2]).toStrictEqual(new Point(1, 2));
      expect(path[3]).toStrictEqual(new Point(2, 2));
      expect(path[4]).toStrictEqual(new Point(2, 3));
      expect(path[5]).toStrictEqual(new Point(2, 4));
    });

    test("obstructed complex", () => {
      const grid = new HexGrid(5, 5);
      grid.setCell(2, 0, 0);
      grid.setCell(1, 2, 0);
      grid.setCell(2, 2, 0);
      grid.setCell(0, 3, 0);
      grid.setCell(3, 3, 0);

      const path = grid.getShortestPath(new Point(0, 0), new Point(2, 4));
      expect(path[0]).toStrictEqual(new Point(0, 1));
      expect(path[1]).toStrictEqual(new Point(0, 2));
      expect(path[2]).toStrictEqual(new Point(-1, 3));
      expect(path[3]).toStrictEqual(new Point(-1, 4));
      expect(path[4]).toStrictEqual(new Point(0, 4));
      expect(path[5]).toStrictEqual(new Point(1, 4));
    });

    test("impossible", () => {
      const grid = new HexGrid(5, 5);
      grid.setCell(2, 3, 0);
      grid.setCell(3, 3, 0);
      grid.setCell(2, 4, 0);

      expect(() =>
        grid.getShortestPath(new Point(0, 0), new Point(2, 4)),
      ).toThrow();
    });

    test("invalid points", () => {
      const grid = new HexGrid(5, 5);
      expect(() =>
        grid.getShortestPath(new Point(0, 6), new Point(6, 0)),
      ).toThrow();
    });
  });
});
