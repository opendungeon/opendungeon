import type { Point } from "./point";

export enum Terrain {
  None = 0,
  Default,
}

export type Cell = {
  q: number;
  r: number;
  terrain: Terrain;
};

export class HexGrid {
  private cells: Cell[][];

  constructor(w: number, h: number) {
    this.cells = [];

    for (let row = 0; row < h; row += 1) {
      this.cells.push([]);
      for (let col = 0; col < w; col += 1) {
        const q = col - Math.floor(row / 2);
        const r = row;
        const cell = { q, r, terrain: Terrain.Default };
        this.cells[row]!.push(cell);
      }
    }
  }

  getCell(q: number, r: number): Cell | null {
    const row = this.cells[r];
    if (!row) {
      return null;
    }

    for (let i = 0; i < row.length; i += 1) {
      const cell = row[i]!;
      if (cell.q === q) {
        return cell;
      }
    }

    return null;
  }

  setCell(q: number, r: number, terrain: Terrain): boolean {
    const row = this.cells[r];

    if (!row) {
      return false;
    }

    for (let i = 0; i < row.length; i += 1) {
      if (row[i]!.q === q) {
        this.cells[r]![i]!.terrain = terrain;
        return true;
      }
    }

    return false;
  }

  toString(): string {
    if (this.cells.length === 0) {
      return "";
    }

    const { minQ, lines } = this.cells.reduce<{
      minQ: number;
      lines: { q: number; content: string }[];
    }>(
      ({ minQ, lines }, row, i) => {
        if (row.length < 1) {
          return { minQ, lines };
        }

        const q = row[0]!.q + Math.floor(i / 2);
        return {
          minQ: q < minQ ? row[0]!.q : minQ,
          lines: [
            ...lines,
            {
              q,
              content: row
                .map((col) => (col.terrain === Terrain.None ? "  " : "⬡ "))
                .join("")
                .trimEnd(),
            },
          ],
        };
      },
      { minQ: 0, lines: [] },
    );

    return lines
      .map(({ q, content }, row) => {
        const ws = new Array(q - minQ + (row % 2 === 1 ? 1 : 0))
          .fill(" ")
          .join("");
        return ws + content;
      })
      .join("\n");
  }

  calcDistance(q1: number, r1: number, q2: number, r2: number): number {
    if (!this.getCell(q1, r1)) {
      return -1;
    }

    if (!this.getCell(q2, r2)) {
      return -1;
    }

    const qDist = Math.abs(q1 - q2);
    const rDist = Math.abs(r1 - r2);
    const sDist = Math.abs(q1 + r1 - q2 - r2);
    return (qDist + rDist + sDist) / 2;
  }

  getShortestPath(start: Point, goal: Point): Point[] {
    const startCell = this.getCell(start.q, start.r);
    const goalCell = this.getCell(goal.q, goal.r);

    if (
      !startCell ||
      startCell.terrain === Terrain.None ||
      !goalCell ||
      goalCell.terrain === Terrain.None
    ) {
      throw new Error("no valid path");
    }

    const frontier = new Array<Point>();
    frontier.push(start);
    const cameFrom = new Map<Point, Point>();
    cameFrom.set(start, start);

    while (frontier.length > 0) {
      let current = frontier.shift()!;

      if (current.equal(goal)) {
        const path: Point[] = [];
        while (current.inequal(start)) {
          path.push(current);
          current = cameFrom.get(current)!;
        }

        return path.reverse();
      }

      for (const next of current.getNeighbors()) {
        const cell = this.getCell(next.q, next.r);
        if (!cell || cell.terrain === Terrain.None) {
          continue;
        }

        if (!cameFrom.has(next)) {
          frontier.push(next);
          cameFrom.set(next, current);
        }
      }
    }

    throw new Error("no valid path");
  }
}
