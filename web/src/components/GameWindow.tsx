import { useEffect, useRef, type RefObject } from "react";
import type Game from "@/lib/game";

type GameWindowProps = {
  game: RefObject<Game>;
};

export default function GameWindow({ game }: GameWindowProps) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const lastFrame = useRef(0);

  const runGameLoop = () => {
    window.requestAnimationFrame((currentFrame) => {
      const dt = currentFrame - lastFrame.current;
      game.current.update(dt);
      game.current.draw();
      lastFrame.current = currentFrame;

      runGameLoop();
    });
  };

  useEffect(() => {
    if (!canvas.current) {
      return;
    }

    game.current.start(canvas.current!).then(runGameLoop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvas} className="absolute inset-0" />;
}
