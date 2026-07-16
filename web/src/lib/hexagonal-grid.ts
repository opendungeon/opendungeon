import { Axial } from "$lib/point";

export type Cell<T> = {
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

  get size(): number {
    return this.rows.reduce((total, row) => total + row.length, 0);
  }

  get cells(): Cell<T>[] {
    return this.rows.flat();
  }

  *[Symbol.iterator](): Iterator<Cell<T>> {
    for (let row = 0; row < this.rows.length; row++) {
      for (let col = 0; col < this.rows[row].length; col++) {
        yield this.rows[row][col];
      }
    }
  }

  has(point: Axial): boolean {
    const row = this.rows[point.r];
    if (!row) {
      return false;
    }

    for (let i = 0; i < row.length; i += 1) {
      const cell = row[i]!;
      if (cell.point.q === point.q) {
        return true;
      }
    }

    return false;
  }

  get(point: Axial): Cell<T> | null {
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

  set(point: Axial, value: T): boolean {
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

  calcDistance(a: Axial, b: Axial, ignoreBounds?: boolean): number {
    if (!ignoreBounds && (!this.get(a) || !this.get(b))) {
      return -1;
    }

    const ac = a.toCube();
    const bc = b.toCube();

    const qDist = Math.abs(ac.q - bc.q);
    const rDist = Math.abs(ac.r - bc.r);
    const sDist = Math.abs(ac.s - bc.s);
    return (qDist + rDist + sDist) / 2;
  }

  shrink(isEmpty: (value: T) => boolean): HexagonalGrid<T> {
    let firstRow: number | null = null;
    let lastRow: number | null = null;
    let firstColumn: number | null = null;
    let lastColumn: number | null = null;

    for (let row = 0; row < this.rows.length; row++) {
      for (let col = 0; col < this.rows[row].length; col++) {
        const cell = this.rows[row][col];
        if (isEmpty(cell.value)) {
          continue;
        }

        if (firstRow === null) {
          firstRow = row;
        }
        if (firstColumn === null || col < firstColumn) {
          firstColumn = col;
        }

        lastRow = row;
        if (lastColumn === null || col > lastColumn) {
          lastColumn = col;
        }
      }
    }

    if (firstRow === null || lastRow === null || firstColumn === null || lastColumn === null) {
      throw new Error("Cannot shrink an empty grid");
    }

    const shrunkGrid = new HexagonalGrid<T>(lastColumn - firstColumn, lastRow - firstRow, {
      isEmpty: true,
    } as T);

    for (let row = firstRow; row < lastRow; row++) {
      for (let col = firstColumn; col < lastColumn; col++) {
        const shrunkRow = row - firstRow;
        const shrunkCol = col - firstColumn;
        const cell = this.rows[row][col];
        shrunkGrid.rows[shrunkRow]![shrunkCol]!.value = cell.value;
      }
    }

    return shrunkGrid;
  }

  toObject(): ({ q: number; r: number } & T)[] {
    return this.cells.map((cell) => ({
      ...cell.point,
      ...cell.value,
    }));
  }
}
