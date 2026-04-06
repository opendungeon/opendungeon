import { Graphics } from "pixi.js";
import { useCallback } from "react";

const HEXAGON_RADIUS = 50;

function drawHexagon(ctx: Graphics, x: number, y: number) {
  ctx.setStrokeStyle({ width: 2, color: "white" });
  ctx.beginPath();

  for (let i = 0; i < 6; i++) {
    // 2 * Math.PI / 6 = 60 degrees per side
    // Subtracting Math.PI / 2 (-90 deg) points the first vertex UP
    const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
    const vx = HEXAGON_RADIUS * Math.cos(angle) + x;
    const vy = 0.5 * HEXAGON_RADIUS * Math.sin(angle) + y;

    if (i === 0) {
      ctx.moveTo(vx, vy);
    } else {
      ctx.lineTo(vx, vy);
    }
  }

  ctx.closePath();
  ctx.stroke();
}

export default function Hexagon() {
  const drawCallback = useCallback((ctx: Graphics) => {
    ctx.clear();
    drawHexagon(ctx, 0, 0);
    drawHexagon(ctx, 85, 0);
  }, []);

  return <pixiGraphics draw={drawCallback} />;
}
