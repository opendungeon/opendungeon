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

export class Cartesian {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  static lerp(a: Cartesian, b: Cartesian, t: number): Cartesian {
    return new Cartesian(lerp(a.x, b.x, t), lerp(a.y, b.y, t));
  }

  add(other: Cartesian): Cartesian {
    return new Cartesian(this.x + other.x, this.y + other.y);
  }

  subtract(other: Cartesian): Cartesian {
    return new Cartesian(this.x - other.x, this.y - other.y);
  }

  scale(scalar: number): Cartesian {
    return new Cartesian(scalar * this.x, scalar * this.y);
  }

  round(): Cartesian {
    return new Cartesian(Math.round(this.x), Math.round(this.y));
  }

  floor(): Cartesian {
    return new Cartesian(Math.floor(this.x), Math.floor(this.y));
  }

  distance(other: Cartesian): number {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  diagonalDistance(other: Cartesian): number {
    return Math.max(Math.abs(other.x - this.x), Math.abs(other.y - this.y));
  }

  isEqual(other: Cartesian): boolean {
    return this.x === other.x && this.y === other.y;
  }

  getNeighbors() {
    return [
      new Cartesian(this.x - 1, this.y - 1),
      new Cartesian(this.x, this.y - 1),
      new Cartesian(this.x + 1, this.y - 1),
      new Cartesian(this.x - 1, this.y),
      new Cartesian(this.x + 1, this.y),
      new Cartesian(this.x - 1, this.y + 1),
      new Cartesian(this.x, this.y + 1),
      new Cartesian(this.x + 1, this.y + 1),
    ];
  }

  toString(): string {
    return `(${this.x}, ${this.y})`;
  }

  angle(other: Cartesian): number {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    return Math.atan2(dy, dx);
  }
}
