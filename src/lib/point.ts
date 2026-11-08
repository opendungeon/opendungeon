const PI_OVER_180 = Math.PI / 180;
const PI_UNDER_180 = 180 / Math.PI;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function degToRad(deg: number): number {
  return deg * PI_OVER_180;
}

export function radToDeg(rad: number): number {
  return rad * PI_UNDER_180;
}

export interface Coord {
  x: number;
  y: number;
}

export class Point implements Coord {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  static lerp(a: Coord, b: Coord, t: number): Point {
    return new Point(lerp(a.x, b.x, t), lerp(a.y, b.y, t));
  }

  static fromCoord({ x, y }: Coord): Point {
    return new Point(x, y);
  }

  add(other: Point): Point {
    return new Point(this.x + other.x, this.y + other.y);
  }

  subtract(other: Point): Point {
    return new Point(this.x - other.x, this.y - other.y);
  }

  scale(scalar: number): Point {
    return new Point(scalar * this.x, scalar * this.y);
  }

  round(): Point {
    return new Point(Math.round(this.x), Math.round(this.y));
  }

  floor(): Point {
    return new Point(Math.floor(this.x), Math.floor(this.y));
  }

  distance(other: Coord): number {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  diagonalDistance(other: Point): number {
    return Math.max(Math.abs(other.x - this.x), Math.abs(other.y - this.y));
  }

  isEqual(other: Point): boolean {
    return this.x === other.x && this.y === other.y;
  }

  getNeighbors() {
    const nearestX = Math.round(this.x);
    const nearestY = Math.round(this.y);
    return [
      new Point(nearestX - 1, nearestY - 1),
      new Point(nearestX, nearestY - 1),
      new Point(nearestX + 1, nearestY - 1),
      new Point(nearestX - 1, nearestY),
      new Point(nearestX + 1, nearestY),
      new Point(nearestX - 1, nearestY + 1),
      new Point(nearestX, nearestY + 1),
      new Point(nearestX + 1, nearestY + 1),
    ];
  }

  toString(): string {
    return `(${this.x}, ${this.y})`;
  }

  angle(other: Coord): number {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    return Math.atan2(dy, dx);
  }
}
