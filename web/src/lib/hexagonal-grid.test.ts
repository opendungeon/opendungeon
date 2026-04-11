import { describe, expect, test } from "vitest";
import HexagonalGrid from "./hexagonal-grid";
import { Axial } from "./point";

describe.concurrent("HexGrid", () => {
  describe("getCell", () => {
    test("gets existing cell", () => {
      const grid = new HexagonalGrid(7, 7, 1);

      (
        [
          [0, 0],
          [6, 0],
          [-3, 6],
          [3, 6],
        ] as const
      ).forEach(([q, r]) => {
        const cell = grid.getCell(new Axial(q, r));
        expect(cell).not.toBeNull();
        expect(cell).toStrictEqual({ point: new Axial(q, r), value: 1 });
      });
    });

    test("get out of bounds", () => {
      const grid = new HexagonalGrid(7, 7, 1);
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
        const cell = grid.getCell(new Axial(q, r));
        expect(cell).toBeNull();
      });
    });
  });

  describe("calcDistance", () => {
    test("straight horizontal", () => {
      const grid = new HexagonalGrid(10, 10, 1);
      const distance = grid.calcDistance(new Axial(0, 0), new Axial(9, 0));
      expect(distance).toBe(9);
    });

    test("straight diagonal", () => {
      const grid = new HexagonalGrid(10, 10, 1);
      const distance = grid.calcDistance(new Axial(0, 0), new Axial(5, 9));
      expect(distance).toBe(14);
    });
  });
});
