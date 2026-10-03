import { Cartesian } from "$lib/point";
import { MeasureShape, type GameTool } from ".";
import * as GLM from "gl-matrix";

type SelectTool = object; // TODO: Replace with actual configuration
type MeasureTool = {
  shape: MeasureShape;
  lineTransform: GLM.mat4 | null;
  cells: Cartesian[];
  distance: number;
};
type ShapeTool = object;
type DrawTool = object;
type DiceTool = object;

export class GameTools {
  activeTool: GameTool | null = $state(null);
  select: SelectTool = $state.raw({});
  measure: MeasureTool = $state.raw({
    shape: MeasureShape.Line,
    useFullCells: true,
    lineTransform: null,
    cells: [],
    distance: 0,
  });
  shape: ShapeTool = $state.raw({});
  draw: DrawTool = $state.raw({});
  dice: DiceTool = $state.raw({});

  updateMeasureLine(from: Cartesian, to: Cartesian, width: number) {
    const difference = to.subtract(from);
    const halfDifference = difference.scale(0.5);
    const midpoint = from.add(halfDifference);
    const length = Math.sqrt(difference.x * difference.x + difference.y * difference.y);
    const theta = Math.atan(difference.y / difference.x);

    const transform = GLM.mat4.create();
    GLM.mat4.translate(transform, transform, GLM.vec3.fromValues(midpoint.x, midpoint.y, 0.2));
    GLM.mat4.rotate(transform, transform, theta, GLM.vec3.fromValues(0, 0, 1));
    GLM.mat4.scale(transform, transform, GLM.vec3.fromValues(length, width, 1));

    this.measure.lineTransform = transform;
  }

  updateMeasureCells(from: Cartesian, to: Cartesian) {
    this.measure = { ...this.measure, cells: [] };

    let distance = Math.floor(from.distance(to));
    if (this.measure.shape === MeasureShape.Square) {
      distance += 1;
    } else if (this.measure.shape === MeasureShape.Circle) {
      distance = Math.max(1, distance);
    }
    let cells = [...this.measure.cells];
    switch (this.measure.shape) {
      case MeasureShape.Path:
        cells = this.getCellsInLine(from, to); // TODO: Replace with getCellsInPath once weights and obstacles are a thing, which uses a pathfinding algorithm
        break;
      case MeasureShape.Line:
        cells = this.getCellsInLine(from, to);
        break;
      case MeasureShape.Square:
        cells = this.getCellsInSquare(from, to);
        break;
      case MeasureShape.Circle:
        cells = this.getCellsInCircle(from, to);
        break;
      case MeasureShape.Cone:
        cells = this.getCellsInCone(from, to);
        break;
    }

    this.measure = { ...this.measure, cells, distance };
  }

  private getCellsInLine(from: Cartesian, to: Cartesian): Cartesian[] {
    const cells: Cartesian[] = [];
    const n = Math.round(from.distance(to));
    for (let step = 1; step <= n; step++) {
      const t = n === 0 ? 0.0 : step / n;
      cells.push(Cartesian.lerp(from, to, t).round());
    }

    return cells;
  }

  private getCellsInSquare(from: Cartesian, to: Cartesian): Cartesian[] {
    const distance = Math.round(from.distance(to));
    const minX = from.x - distance;
    const maxX = from.x + distance;
    const minY = from.y - distance;
    const maxY = from.y + distance;

    const cells: Cartesian[] = [];
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        cells.push(new Cartesian(x, y));
      }
    }

    return cells;
  }

  private getCellsInCircle(from: Cartesian, to: Cartesian): Cartesian[] {
    // grid intersections sit on half-integers since cells are centered on integers
    const origin = from;
    const radius = Math.round(origin.distance(to));

    const cells: Cartesian[] = [];
    for (let x = Math.ceil(origin.x - radius); x <= Math.floor(origin.x + radius); x++) {
      for (let y = Math.ceil(origin.y - radius); y <= Math.floor(origin.y + radius); y++) {
        const cell = new Cartesian(x, y);
        if (cell.distance(origin) <= radius) {
          cells.push(cell);
        }
      }
    }

    return cells;
  }

  private getCellsInCone(from: Cartesian, to: Cartesian): Cartesian[] {
    const length = Math.round(from.distance(to));
    if (length === 0) {
      return [];
    }

    // the cone starts where the direction leaves the caster's cell: the middle of an edge when
    // aimed straight, a corner when aimed diagonally
    const theta = Math.atan2(to.y - from.y, to.x - from.x);
    const direction = new Cartesian(Math.cos(theta), Math.sin(theta));
    const toEdge = 0.5 / Math.max(Math.abs(direction.x), Math.abs(direction.y));
    const origin = new Cartesian(from.x + direction.x * toEdge, from.y + direction.y * toEdge);

    // a cone's width at any point along its length equals that point's distance from the origin,
    // so it is an isosceles triangle with a base as wide as it is long
    const halfBase = new Cartesian(-direction.y * 0.5 * length, direction.x * 0.5 * length);
    const end = new Cartesian(origin.x + direction.x * length, origin.y + direction.y * length);
    // counter-clockwise winding so the inside of every edge is on its left
    const triangle = [origin, end.subtract(halfBase), end.add(halfBase)];

    // positive when p is left of the edge a -> b
    const side = (a: Cartesian, b: Cartesian, p: Cartesian) =>
      (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);

    // area of the cell clipped to the triangle (Sutherland-Hodgman)
    const coveredArea = (cell: Cartesian): number => {
      let polygon = [
        new Cartesian(cell.x - 0.5, cell.y - 0.5),
        new Cartesian(cell.x + 0.5, cell.y - 0.5),
        new Cartesian(cell.x + 0.5, cell.y + 0.5),
        new Cartesian(cell.x - 0.5, cell.y + 0.5),
      ];
      for (let i = 0; i < triangle.length && polygon.length > 0; i++) {
        const a = triangle[i];
        const b = triangle[(i + 1) % triangle.length];
        const clipped: Cartesian[] = [];
        for (let j = 0; j < polygon.length; j++) {
          const previous = polygon[(j + polygon.length - 1) % polygon.length];
          const current = polygon[j];
          const previousSide = side(a, b, previous);
          const currentSide = side(a, b, current);
          if (previousSide >= 0 !== currentSide >= 0) {
            clipped.push(
              Cartesian.lerp(previous, current, previousSide / (previousSide - currentSide)),
            );
          }
          if (currentSide >= 0) {
            clipped.push(current);
          }
        }
        polygon = clipped;
      }

      let area = 0;
      for (let j = 0; j < polygon.length; j++) {
        const p = polygon[j];
        const q = polygon[(j + 1) % polygon.length];
        area += p.x * q.y - q.x * p.y;
      }
      return Math.abs(area) / 2;
    };

    const minX = Math.round(Math.min(...triangle.map((p) => p.x)));
    const maxX = Math.round(Math.max(...triangle.map((p) => p.x)));
    const minY = Math.round(Math.min(...triangle.map((p) => p.y)));
    const maxY = Math.round(Math.max(...triangle.map((p) => p.y)));

    // a cell is affected based on a percentage of coverage
    const cells: Cartesian[] = [];
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const cell = new Cartesian(x, y);
        if (coveredArea(cell) >= 0.45 - 1e-6) {
          cells.push(cell);
        }
      }
    }

    return cells;
  }
}
