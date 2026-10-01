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

  round(): Cartesian {
    return new Cartesian(Math.round(this.x), Math.round(this.y));
  }
}
