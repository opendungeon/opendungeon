import type { Curve, Segment } from "#lib/curves/index.ts";
import { Point, type Coord } from "#lib/point.ts";
import { error, unwrap } from "@opendungeon/result";

/*
const MAX_BINOMIAL = 500;
const pascalTriangle = [[1], [1, 1]];

for (let i = 2; i < MAX_BINOMIAL; i++) {
  const prevBinomial = pascalTriangle[i - 1];
  const binomial = [1];
  for (let j = 0; j < prevBinomial.length - 1; j++) {
    binomial.push(prevBinomial[j] + prevBinomial[j + 1]);
  }
  binomial.push(1);
  pascalTriangle.push(binomial);
}
*/

export class Bezier implements Curve {
  private points: Coord[];

  readonly length: number;
  readonly segments: Segment[];

  // TODO: handle empty points list
  constructor(points: Coord[]) {
    this.points = points;

    const segmentCount = Math.ceil(0.5 * points.length);
    const step = 1 / segmentCount;
    const segmentNodes = [];
    for (let i = 0; i <= segmentCount; i++) {
      const t = i * step;
      segmentNodes.push(getCurvePoint(points, t));
    }

    this.segments = [];
    this.length = 0;
    for (let i = 0; i < segmentNodes.length - 1; i++) {
      const start = segmentNodes[i];
      const end = segmentNodes[i + 1];
      const length = start.distance(end);
      this.segments.push({ start, end, length });
      this.length += length;
    }
  }

  get start(): Point {
    return Point.fromCoord(this.points.at(0)!);
  }

  get end(): Point {
    return Point.fromCoord(this.points.at(-1)!);
  }

  getAngle(t: number): number {
    const target = this.getSegment(t);
    if (!target) {
      return 0;
    }

    return target.segment.start.angle(target.segment.end);
  }

  getPoint(t: number): Point {
    if (this.points.length < 2) {
      return Point.fromCoord(this.points[0]);
    }

    const target = this.getSegment(t);
    if (!target) {
      unwrap(error("Failed to get target segment."));
    }

    const { segment, localT } = target!;
    return Point.lerp(segment.start, segment.end, localT);
  }

  private getSegment(t: number): { segment: Segment; localT: number } | null {
    const targetLength = t * this.length;
    let passedLength = 0;
    let segment: Segment | undefined;
    for (let i = 0; i < this.segments.length; i++) {
      const endLength = passedLength + this.segments[i].length;
      if (passedLength <= targetLength && targetLength <= endLength) {
        segment = this.segments[i];
        break;
      }

      passedLength = endLength;
    }

    if (!segment) {
      return null;
    }

    const localT = (targetLength - passedLength) / segment.length;
    return { segment, localT };
  }
}

/**
 * This gets a point along a bezier curve defined by `points`.
 *
 * Iterative implementation of [De CastelJau's Algorithm](https://en.wikipedia.org/wiki/De_Casteljau%27s_algorithm).
 */
function getCurvePoint(points: Coord[], t: number): Point {
  let myPoints = points;
  while (true) {
    if (myPoints.length === 1) {
      return Point.fromCoord(myPoints[0]);
    }

    const newPoints = [];
    for (let i = 0; i < myPoints.length - 1; i++) {
      const x = (1 - t) * myPoints[i].x + t * myPoints[i + 1].x;
      const y = (1 - t) * myPoints[i].y + t * myPoints[i + 1].y;
      newPoints.push({ x, y });
    }
    myPoints = newPoints;
  }
}
