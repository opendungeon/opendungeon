function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class Axial {
  q: number;
  r: number;

  constructor(q: number, r: number) {
    this.q = q;
    this.r = r;
  }

  isEqual(other: Axial): boolean {
    return this.q === other.q && this.r === other.r;
  }

  stringify(): string {
    return `${this.q},${this.r}`;
  }

  getNorthEastNeighbor(): Axial {
    return new Axial(this.q + 1, this.r - 1);
  }

  getEastNeighbor(): Axial {
    return new Axial(this.q + 1, this.r);
  }

  getSouthEastNeighbor(): Axial {
    return new Axial(this.q, this.r + 1);
  }

  getSouthWestNeighbor(): Axial {
    return new Axial(this.q - 1, this.r + 1);
  }

  getWestNeighbor(): Axial {
    return new Axial(this.q - 1, this.r);
  }

  getNorthWestNeighbor(): Axial {
    return new Axial(this.q, this.r - 1);
  }

  getNeighbors(): Axial[] {
    return [
      this.getNorthEastNeighbor(),
      this.getEastNeighbor(),
      this.getSouthEastNeighbor(),
      this.getSouthWestNeighbor(),
      this.getWestNeighbor(),
      this.getNorthWestNeighbor(),
    ];
  }

  toCube(): Cube {
    const s = -this.q - this.r;
    return new Cube(this.q, this.r, s);
  }

  toCartesian(xRadius: number, yRadius: number): Cartesian {
    let x = Math.sqrt(3) * this.q + (Math.sqrt(3) / 2) * this.r;
    let y = (3 / 2) * this.r;
    x *= xRadius;
    y *= yRadius;
    return new Cartesian(x, y);
  }

  add(other: Axial): Axial {
    return new Axial(this.q + other.q, this.r + other.r);
  }

  static fromCartesian(
    point: Cartesian,
    xRadius: number,
    yRadius: number,
  ): Axial {
    const x = point.x / xRadius;
    const y = point.y / yRadius;
    const q = (Math.sqrt(3) / 3) * x - (1 / 3) * y;
    const r = (2 / 3) * y;
    return Axial.round(new Axial(q, r));
  }

  static round(frac: Axial): Axial {
    return Cube.round(frac.toCube()).toAxial();
  }
}

export class Cube {
  q: number;
  r: number;
  s: number;

  constructor(q: number, r: number, s: number) {
    this.q = q;
    this.r = r;
    this.s = s;
  }

  toAxial(): Axial {
    return new Axial(this.q, this.r);
  }

  lerp(other: Cube, t: number): Cube {
    return new Cube(
      lerp(this.q, other.q, t),
      lerp(this.r, other.r, t),
      lerp(this.s, other.s, t),
    );
  }

  add(other: Cube): Cube {
    return new Cube(this.q + other.q, this.r + other.r, this.s + other.s);
  }

  static round(frac: Cube): Cube {
    let q = Math.round(frac.q);
    let r = Math.round(frac.r);
    let s = Math.round(frac.s);
    const qDiff = Math.abs(q - frac.q);
    const rDiff = Math.abs(r - frac.r);
    const sDiff = Math.abs(s - frac.s);

    if (qDiff > rDiff && qDiff > sDiff) {
      q = -r - s;
    } else if (rDiff > sDiff) {
      r = -q - s;
    } else {
      s = -q - r;
    }

    return new Cube(q, r, s);
  }
}

export class Cartesian {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}
