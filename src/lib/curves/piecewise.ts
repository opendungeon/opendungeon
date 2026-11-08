import type { Curve, Segment } from "#lib/curves/index.ts";
import { Point, type Coord } from "#lib/point.ts";
import { error, ok, type Result } from "@opendungeon/result";

/**
 * A curve of straight line segments between specified points.
 */
export class PieceWise implements Curve {
  private points: Coord[];

  readonly length: number;
  readonly segments: Segment[];

  private constructor(points: Coord[], segments: Segment[], length: number) {
    this.points = points;
    this.segments = segments;
    this.length = length;
  }

  static fromCoords(points: Coord[]): Result<PieceWise, string> {
    if (points.length < 1) {
      return error("Curve must contain at least one point.");
    }

    if (points.length === 1) {
      return ok(new PieceWise(points, [], 0));
    }

    const segments = [];
    let totalLength = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const start = Point.fromCoord(points[i]);
      const end = Point.fromCoord(points[i + 1]);
      const length = start.distance(end);
      segments.push({ start, end, length });
      totalLength += length;
    }

    return ok(new PieceWise(points, segments, totalLength));
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
