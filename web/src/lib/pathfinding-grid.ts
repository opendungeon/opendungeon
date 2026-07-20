import HexagonalGrid, { type Cell, type Grid } from "$lib/hexagonal-grid";
import { Axial } from "$lib/point";
import { PriorityQueue } from "$lib/priorityqueue";

export interface Weighted {
  weight: number;
}

export default class PathfindingGrid<T extends Weighted> implements Grid<T> {
  private grid: HexagonalGrid<T>;

  private constructor(grid: HexagonalGrid<T>) {
    this.grid = grid;
  }

  static fromDimensions<T extends Weighted>(
    w: number,
    h: number,
    defaultValue: T,
  ): PathfindingGrid<T> {
    const grid = HexagonalGrid.fromDimensions(w, h, defaultValue);
    return new PathfindingGrid(grid);
  }

  static fromCells<T extends Weighted>(cells: Iterable<Cell<T>>): PathfindingGrid<T> {
    const grid = HexagonalGrid.fromCells(cells);
    return new PathfindingGrid(grid);
  }

  get cells(): Cell<T>[] {
    return this.grid.cells;
  }

  get isEmpty(): boolean {
    return this.grid.isEmpty;
  }

  get size(): number {
    return this.grid.size;
  }

  shrink(isEmpty: (value: T) => boolean): PathfindingGrid<T> {
    return new PathfindingGrid(this.grid.shrink(isEmpty));
  }

  has(point: Axial): boolean {
    return this.grid.has(point);
  }

  get(point: Axial): Cell<T> | null {
    return this.grid.get(point);
  }

  set(point: Axial, value: T) {
    return this.grid.set(point, value);
  }

  calcDistance(a: Axial, b: Axial, ignoreBounds?: boolean): number {
    return this.grid.calcDistance(a, b, ignoreBounds);
  }

  getAccessiblePoints(start: Axial, isAccessible: (point: Axial) => boolean): Axial[] {
    const startCell = this.grid.get(start);
    if (!startCell) {
      return [];
    }

    const frontier = [start];
    const visited = new Set([start.stringify()]);
    const points = [start];

    while (frontier.length > 0) {
      const current = frontier.shift()!;

      for (const next of current.getNeighbors()) {
        if (!isAccessible(next) || visited.has(next.stringify())) {
          continue;
        }

        frontier.push(next);
        visited.add(next.stringify());
        points.push(next);
      }
    }

    return points;
  }

  getShortestPath(start: Axial, goal: Axial): { ok: true; path: Axial[] } | { ok: false } {
    const startCell = this.grid.get(start);
    const goalCell = this.grid.get(goal);

    if (!startCell || startCell.value.weight === 0 || !goalCell || goalCell.value.weight === 0) {
      return { ok: false };
    }

    const frontier = new PriorityQueue<Axial>();
    frontier.push(start, 0);
    const costSoFar = new Map<Axial, number>();
    costSoFar.set(start, 0);
    const cameFrom = new Map<Axial, Axial>();
    cameFrom.set(start, start);

    while (!frontier.isEmpty) {
      let current = frontier.pop()!;

      if (current.isEqual(goal)) {
        const path: Axial[] = [];
        while (!current.isEqual(start)) {
          path.push(current);
          current = cameFrom.get(current)!;
        }

        return { ok: true, path: path.reverse() };
      }

      for (const next of current.getNeighbors()) {
        const cell = this.grid.get(next);
        if (!cell || cell.value.weight === 0) {
          continue;
        }

        const newCost = costSoFar.get(current)! + cell.value.weight;
        const heuristic = this.grid.calcDistance(goal, next);
        if (!costSoFar.has(next) || newCost < costSoFar.get(next)!) {
          costSoFar.set(next, newCost);
          const priority = newCost + heuristic;
          frontier.push(next, priority);
          cameFrom.set(next, current);
        }
      }
    }

    return { ok: false };
  }
}
