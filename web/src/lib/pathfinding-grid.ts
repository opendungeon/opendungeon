import HexagonalGrid from "./hexagonal-grid";
import { Axial } from "./point";
import { PriorityQueue } from "./priorityqueue";

export default class PathfindingGrid<T> extends HexagonalGrid<
  T & { weight: number }
> {
  constructor(w: number, h: number, defaultValue: T & { weight: number }) {
    super(w, h, defaultValue);
  }

  getShortestPath(
    start: Axial,
    goal: Axial,
  ): { ok: true; path: Axial[] } | { ok: false } {
    const startCell = this.getCell(start);
    const goalCell = this.getCell(goal);

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
        const cell = this.getCell(next);
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
