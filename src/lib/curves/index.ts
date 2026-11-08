import type { Point } from "#lib/point.ts";

export type Segment = {
  start: Point;
  end: Point;
  length: number;
};

export interface Curve {
  length: number;
  start: Point;
  end: Point;
  segments: Segment[];
  getPoint(t: number): Point;
  getAngle(t: number): number;
}
