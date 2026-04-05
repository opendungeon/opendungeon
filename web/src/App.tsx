import { HexGrid } from "./lib/grid";
import { Point } from "./lib/point";

export default function App() {
  const getGridString = () => {
    const grid = new HexGrid(5, 5);
    grid.setCell(2, 0, 0);
    grid.setCell(1, 2, 0);
    grid.setCell(2, 2, 0);
    grid.setCell(0, 3, 0);
    grid.setCell(3, 3, 0);
    const path = grid.getShortestPath(new Point(0, 0), new Point(2, 4));

    for (let i = 0; i < path.length; i += 1) {
      const cell = path[i];
      grid.setCell(cell.q, cell.r, 2);
    }

    return grid.toString();
  };

  return (
    <>
      <h1>OpenDungeon</h1>
      <code className="whitespace-pre">{getGridString()}</code>
    </>
  );
}
