import { Point, type Coord } from "#lib/point.ts";

export function getCellsInLine(from: Coord, to: Coord): { cells: Point[]; distance: number } {
  const cells: Point[] = [Point.fromCoord(from)];
  const n = Math.round(Point.fromCoord(from).diagonalDistance(to));
  let distance = 0;
  for (let step = 1; step <= n; step++) {
    const t = n === 0 ? 0.0 : step / n;
    const cell = Point.lerp(from, to, t).round();
    const prevCell = cells[step - 2] ?? from;
    if (Math.abs(cell.x - prevCell.x) === 1 && Math.abs(cell.y - prevCell.y) === 1) {
      distance += Math.sqrt(12.5) / 2.5;
    } else {
      distance += 1;
    }
    cells.push(cell);
  }

  return {
    cells,
    distance,
  };
}

export function getCellsInSquare(from: Coord, to: Coord): Point[] {
  const distance = Math.round(Point.fromCoord(from).distance(to));
  const minX = from.x - distance;
  const maxX = from.x + distance;
  const minY = from.y - distance;
  const maxY = from.y + distance;

  const cells: Point[] = [];
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      cells.push(new Point(x, y));
    }
  }

  return cells;
}

export function getCellsInCircle(from: Coord, to: Coord): Point[] {
  // grid intersections sit on half-integers since cells are centered on integers
  const origin = from;
  const radius = Math.round(Point.fromCoord(origin).distance(to));

  const cells: Point[] = [];
  for (let x = Math.ceil(origin.x - radius); x <= Math.floor(origin.x + radius); x++) {
    for (let y = Math.ceil(origin.y - radius); y <= Math.floor(origin.y + radius); y++) {
      const cell = new Point(x, y);
      if (cell.distance(origin) <= radius) {
        cells.push(cell);
      }
    }
  }

  return cells;
}

export function getCellsInCone(from: Coord, to: Coord): Point[] {
  const length = Math.round(Point.fromCoord(from).distance(to));
  if (length === 0) {
    return [];
  }

  // the cone starts where the direction leaves the caster's cell: the middle of an edge when
  // aimed straight, a corner when aimed diagonally
  const theta = Math.atan2(to.y - from.y, to.x - from.x);
  const direction = new Point(Math.cos(theta), Math.sin(theta));
  const toEdge = 0.5 / Math.max(Math.abs(direction.x), Math.abs(direction.y));
  const origin = new Point(from.x + direction.x * toEdge, from.y + direction.y * toEdge);

  // a cone's width at any point along its length equals that point's distance from the origin,
  // so it is an isosceles triangle with a base as wide as it is long
  const halfBase = new Point(-direction.y * 0.5 * length, direction.x * 0.5 * length);
  const end = new Point(origin.x + direction.x * length, origin.y + direction.y * length);
  // counter-clockwise winding so the inside of every edge is on its left
  const triangle = [origin, end.subtract(halfBase), end.add(halfBase)];

  // positive when p is left of the edge a -> b
  const side = (a: Point, b: Point, p: Point) =>
    (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);

  // area of the cell clipped to the triangle (Sutherland-Hodgman)
  const coveredArea = (cell: Point): number => {
    let polygon = [
      new Point(cell.x - 0.5, cell.y - 0.5),
      new Point(cell.x + 0.5, cell.y - 0.5),
      new Point(cell.x + 0.5, cell.y + 0.5),
      new Point(cell.x - 0.5, cell.y + 0.5),
    ];
    for (let i = 0; i < triangle.length && polygon.length > 0; i++) {
      const a = triangle[i];
      const b = triangle[(i + 1) % triangle.length];
      const clipped: Point[] = [];
      for (let j = 0; j < polygon.length; j++) {
        const previous = polygon[(j + polygon.length - 1) % polygon.length];
        const current = polygon[j];
        const previousSide = side(a, b, previous);
        const currentSide = side(a, b, current);
        if (previousSide >= 0 !== currentSide >= 0) {
          clipped.push(Point.lerp(previous, current, previousSide / (previousSide - currentSide)));
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
  const cells: Point[] = [];
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      const cell = new Point(x, y);
      if (coveredArea(cell) >= 0.45 - 1e-6) {
        cells.push(cell);
      }
    }
  }

  return cells;
}
