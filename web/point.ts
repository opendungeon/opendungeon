export class Point {
  q: number;
  r: number;

  constructor(q: number, r: number) {
    this.q = q;
    this.r = r;
  }

  isEqual(other: Point): boolean {
    return this.q === other.q && this.r === other.r;
  }

  stringify(): string {
    return `${this.q},${this.r}`;
  }

  getNorthEastNeighbor(): Point {
    return new Point(this.q + 1, this.r - 1);
  }

  getEastNeighbor(): Point {
    return new Point(this.q + 1, this.r);
  }

  getSouthEastNeighbor(): Point {
    return new Point(this.q, this.r + 1);
  }

  getSouthWestNeighbor(): Point {
    return new Point(this.q - 1, this.r + 1);
  }

  getWestNeighbor(): Point {
    return new Point(this.q - 1, this.r);
  }

  getNorthWestNeighbor(): Point {
    return new Point(this.q, this.r - 1);
  }

  getNeighbors(): Point[] {
    return [
      this.getNorthEastNeighbor(),
      this.getEastNeighbor(),
      this.getSouthEastNeighbor(),
      this.getSouthWestNeighbor(),
      this.getWestNeighbor(),
      this.getNorthWestNeighbor(),
    ];
  }
}
