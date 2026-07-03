import { Axial } from "./point";

export default class HexagonalGrid<T> {
  private rows: { q: number; value: T }[][];

  constructor(w: number, h: number, defaultValue: T) {
    this.rows = [];

    for (let row = 0; row < h; row += 1) {
      this.rows.push([]);
      for (let col = 0; col < w; col += 1) {
        const q = col - Math.floor(row / 2);
        const cell = { q, value: defaultValue };
        this.rows[row]!.push(cell);
      }
    }
  }

  get isEmpty(): boolean {
    return this.rows.length === 0;
  }

  *[Symbol.iterator](): Iterator<T> {
    for (let row = 0; row < this.rows.length; row++) {
      for (let col = 0; col < this.rows[row].length; col++) {
        const { value } = this.rows[row][col];
        yield value;
      }
    }
  }

  forEach(callback: (value: T, axial: Axial) => void) {
    for (let row = 0; row < this.rows.length; row++) {
      for (let col = 0; col < this.rows[row].length; col++) {
        const { q, value } = this.rows[row][col];
        const r = row;
        callback(value, new Axial(q, r));
      }
    }
  }

  has(point: Axial): boolean {
    const row = this.rows[point.r];
    if (!row) {
      return false;
    }

    return !!row.find(({ q }) => q === point.q);
  }

  get(point: Axial): T | null {
    const row = this.rows[point.r];
    if (!row) {
      return null;
    }

    for (let i = 0; i < row.length; i += 1) {
      const cell = row[i]!;
      if (cell.q === point.q) {
        return cell.value;
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
      if (row[i]!.q === point.q) {
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
}
