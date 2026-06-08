import { useCallback, useEffect, useRef } from "react";
import type Game from "../lib/game";

type GameWindowProps = {
  game: Game;
};

export default function GameWindow({ game }: GameWindowProps) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const lastFrame = useRef(0);

  const runGameLoop = useCallback(() => {
    window.requestAnimationFrame((currentFrame) => {
      const dt = currentFrame - lastFrame.current;
      game.update(dt);
      game.draw();
      lastFrame.current = currentFrame;

      runGameLoop();
    });
  }, [game]);

  useEffect(() => {
    if (!canvas.current) {
      return;
    }

    game.start(canvas.current!).then(runGameLoop);
  }, []);

  return <canvas ref={canvas} className="absolute inset-0" />;
}
