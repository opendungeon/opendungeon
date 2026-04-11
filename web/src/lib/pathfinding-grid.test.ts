import { describe, expect, test } from "vitest";
import PathfindingGrid from "./pathfinding-grid";
import { Axial } from "./point";

describe.concurrent("HexGrid", () => {
  describe("calcDistance", () => {
    test("straight horizontal", () => {
      const grid = new PathfindingGrid(10, 10, { weight: 1 });
      const distance = grid.calcDistance(new Axial(0, 0), new Axial(9, 0));
      expect(distance).toBe(9);
    });

    test("straight diagonal", () => {
      const grid = new PathfindingGrid(10, 10, { weight: 1 });
      const distance = grid.calcDistance(new Axial(0, 0), new Axial(5, 9));
      expect(distance).toBe(14);
    });
  });

  describe("getShortestPath", () => {
    test("straight", () => {
      const grid = new PathfindingGrid(5, 5, { weight: 1 });

      const result = grid.getShortestPath(new Axial(0, 0), new Axial(2, 4));
      expect(result.ok).toBeTruthy();
      if (!result.ok) return;

      expect(result.path[0]).toStrictEqual(new Axial(0, 1));
      expect(result.path[1]).toStrictEqual(new Axial(1, 1));
      expect(result.path[2]).toStrictEqual(new Axial(2, 1));
      expect(result.path[3]).toStrictEqual(new Axial(2, 2));
      expect(result.path[4]).toStrictEqual(new Axial(2, 3));
      expect(result.path[5]).toStrictEqual(new Axial(2, 4));
    });

    test("obstructed simple", () => {
      const grid = new PathfindingGrid(5, 5, { weight: 1 });
      grid.setCell(new Axial(2, 0), { weight: 0 });

      const result = grid.getShortestPath(new Axial(0, 0), new Axial(2, 4));
      expect(result.ok).toBeTruthy();
      if (!result.ok) return;

      expect(result.path[0]).toStrictEqual(new Axial(1, 0));
      expect(result.path[1]).toStrictEqual(new Axial(1, 1));
      expect(result.path[2]).toStrictEqual(new Axial(1, 2));
      expect(result.path[3]).toStrictEqual(new Axial(2, 2));
      expect(result.path[4]).toStrictEqual(new Axial(2, 3));
      expect(result.path[5]).toStrictEqual(new Axial(2, 4));
    });

    test("obstructed complex", () => {
      const grid = new PathfindingGrid(5, 5, { weight: 1 });
      grid.setCell(new Axial(2, 0), { weight: 0 });
      grid.setCell(new Axial(1, 2), { weight: 0 });
      grid.setCell(new Axial(2, 2), { weight: 0 });
      grid.setCell(new Axial(0, 3), { weight: 0 });
      grid.setCell(new Axial(3, 3), { weight: 0 });

      const result = grid.getShortestPath(new Axial(0, 0), new Axial(2, 4));
      expect(result.ok).toBeTruthy();
      if (!result.ok) return;

      expect(result.path[0]).toStrictEqual(new Axial(0, 1));
      expect(result.path[1]).toStrictEqual(new Axial(0, 2));
      expect(result.path[2]).toStrictEqual(new Axial(-1, 3));
      expect(result.path[3]).toStrictEqual(new Axial(-1, 4));
      expect(result.path[4]).toStrictEqual(new Axial(0, 4));
      expect(result.path[5]).toStrictEqual(new Axial(1, 4));
    });

    test("impossible", () => {
      const grid = new PathfindingGrid(5, 5, { weight: 1 });
      grid.setCell(new Axial(2, 3), { weight: 0 });
      grid.setCell(new Axial(3, 3), { weight: 0 });
      grid.setCell(new Axial(2, 4), { weight: 0 });

      const result = grid.getShortestPath(new Axial(0, 0), new Axial(2, 4));
      expect(result.ok).toBeFalsy();
    });

    test("invalid points", () => {
      const grid = new PathfindingGrid(5, 5, { weight: 1 });
      const result = grid.getShortestPath(new Axial(0, 6), new Axial(6, 0));
      expect(result.ok).toBeFalsy();
    });
  });
});
