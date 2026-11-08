import type { Curve, Segment } from "#lib/curves/index.ts";
import { Point, type Coord } from "#lib/point.ts";

/**
 * A curve of straight line segments between specified points.
 */
export class PieceWise implements Curve {
  private points: Coord[];

  readonly length: number;
  readonly segments: Segment[];

  // TODO: error out/handle empty points list
  constructor(points: Coord[]) {
    this.points = points;

    this.segments = [];
    this.length = 0;
    for (let i = 0; i < this.points.length - 1; i++) {
      const start = Point.fromCoord(this.points[i]);
      const end = Point.fromCoord(this.points[i + 1]);
      const length = start.distance(end);
      this.segments.push({ start, end, length });
      this.length += length;
    }
  }

  get start(): Point {
    return Point.fromCoord(this.points[0]);
  }

  get end(): Point {
    return Point.fromCoord(this.points.at(-1)!);
  }

  getAngle(t: number): number {
    const dt = t * (this.points.length - 1);
    const aIndex = Math.floor(dt);
    const bIndex = Math.ceil(dt);
    const a = this.points[aIndex];
    const b = this.points[bIndex];

    return bIndex !== this.points.length - 1 || this.points.length < 2
      ? Point.fromCoord(a).angle(b)
      : Point.fromCoord(this.points[bIndex - 1]).angle(b);
  }

  getPoint(t: number): Point {
    const dt = t * (this.points.length - 1);
    const a = this.points[Math.floor(dt)];
    const b = this.points[Math.ceil(dt)];
    const frac = dt - Math.trunc(dt);
    return Point.lerp(a, b, frac);
  }
}
