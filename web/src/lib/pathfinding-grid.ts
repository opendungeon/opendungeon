import HexagonalGrid from "@/lib/hexagonal-grid";
import { Axial } from "@/lib/point";
import { PriorityQueue } from "@/lib/priorityqueue";

export interface Weighted {
  weight: number;
}

export default class PathfindingGrid<
  T extends Weighted,
> extends HexagonalGrid<T> {
  constructor(w: number, h: number, defaultValue: T) {
    super(w, h, defaultValue);
  }

  getAccessiblePoints(
    start: Axial,
    isAccessible: (point: Axial) => boolean,
  ): Axial[] {
    const startCell = this.get(start);
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

  getShortestPath(
    start: Axial,
    goal: Axial,
  ): { ok: true; path: Axial[] } | { ok: false } {
    const startCell = this.get(start);
    const goalCell = this.get(goal);

    if (
      !startCell ||
      startCell.value.weight === 0 ||
      !goalCell ||
      goalCell.value.weight === 0
    ) {
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
        const cell = this.get(next);
        if (!cell || cell.value.weight === 0) {
          continue;
        }

        const newCost = costSoFar.get(current)! + cell.value.weight;
        const heuristic = this.calcDistance(goal, next);
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
