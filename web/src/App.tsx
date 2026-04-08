import { extend } from "@pixi/react";
import { Container, Graphics } from "pixi.js";
import GameBoard from "./components/GameBoard";
import { HexGrid } from "./lib/grid";

extend({ Container, Graphics });

export default function App() {
  const getGrid = () => {
    const grid = new HexGrid(5, 5);

    // impossible
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

  return (
    <>
      <h1 className="text-red-600">OpenDungeon - Development</h1>
      <GameBoard grid={getGrid()} />
    </>
  );
}
