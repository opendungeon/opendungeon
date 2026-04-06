import GameWindow from "./components/GameWindow";
import { extend } from "@pixi/react";
import { Container, Graphics } from "pixi.js";

extend({ Container, Graphics });

export default function App() {
  return (
    <>
      <h1 className="text-red-600">OpenDungeon - Development</h1>
      <GameWindow />
    </>
  );
}
