import { Axial } from "./point";

type Cell<T> = {
  point: Axial;
  value: T;
};

export default class HexagonalGrid<T> {
  private rows: Cell<T>[][];

  constructor(w: number, h: number, defaultValue: T) {
    this.rows = [];

    for (let row = 0; row < h; row += 1) {
      this.rows.push([]);
      for (let col = 0; col < w; col += 1) {
        const q = col - Math.floor(row / 2);
        const r = row;
        const cell = { point: new Axial(q, r), value: defaultValue };
        this.rows[row]!.push(cell);
      }
    }
  }

  get isEmpty(): boolean {
    return this.rows.length === 0;
  }

  get cells(): Cell<T>[] {
    return this.rows.flat();
  }

  forEachCell(cb: (cell: Cell<T>) => void) {
    for (let row = 0; row < this.rows.length; row += 1) {
      for (let col = 0; col < this.rows[row].length; col += 1) {
        const cell = this.rows[row][col];
        cb(cell);
      }
    }
  }

  getCell(point: Axial): Cell<T> | null {
    const row = this.rows[point.r];
    if (!row) {
      return null;
    }

    for (let i = 0; i < row.length; i += 1) {
      const cell = row[i]!;
      if (cell.point.q === point.q) {
        return cell;
      }
    }

    return null;
  }

  setCell(point: Axial, value: T): boolean {
    const row = this.rows[point.r];

    if (!row) {
      return false;
    }

    for (let i = 0; i < row.length; i += 1) {
      if (row[i]!.point.q === point.q) {
        this.rows[point.r]![i]!.value = value;
        return true;
      }
    }

    return false;
  }
}
