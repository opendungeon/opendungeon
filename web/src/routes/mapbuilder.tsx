import { createFileRoute } from "@tanstack/react-router";
import GameBoard from "../components/GameBoard";
import { HexGrid } from "../lib/grid";

export const Route = createFileRoute("/mapbuilder")({
  component: MapBuilder,
});

function MapBuilder() {
  const getGrid = () => {
    const grid = new HexGrid(5, 5);

    // obstructed
    grid.setCell(2, 0, 0);
    grid.setCell(1, 2, 0);
    grid.setCell(2, 2, 0);
    grid.setCell(0, 3, 0);
    grid.setCell(3, 3, 0);

    // difficult
    grid.setCell(1, 1, 2);
    grid.setCell(0, 2, 2);
    grid.setCell(-1, 3, 2);

    return grid;
  };

  return <GameBoard grid={getGrid()} />;
}
