import { Graphics, Point, type ColorSource } from "pixi.js";
import { useCallback } from "react";
import { Axial } from "../lib/point";

function drawHexagon(
  ctx: Graphics,
  x: number,
  y: number,
  radius: number,
  width: number,
  color: ColorSource,
) {
  ctx.setStrokeStyle({ width, color });
  ctx.beginPath();

  for (let i = 0; i < 6; i++) {
    const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
    const vx = radius * Math.cos(angle) + x;
    const vy = 0.5 * radius * Math.sin(angle) + y;

    if (i === 0) {
      ctx.moveTo(vx, vy);
    } else {
      ctx.lineTo(vx, vy);
    }
  }

  ctx.closePath();
  ctx.stroke();
}

type HexagonalGridProps = {
  width: number;
  height: number;
  radius: number;
  position?: Point;
  scale?: number;
  selectedCell?: { q: number; r: number };
};

export default function HexagonalGrid({
  width,
  height,
  radius,
  position,
  scale,
  selectedCell,
}: HexagonalGridProps) {
  const drawCallback = useCallback(
    (ctx: Graphics) => {
      ctx.clear();

      for (let row = 0; row < height; row += 1) {
        for (let col = 0; col < width; col += 1) {
          const { x, y } = new Axial(col, row).toPixel(radius, 0.5 * radius);
          drawHexagon(ctx, x, y, radius, 3, "white");
        }
      }

      if (selectedCell) {
        const { x, y } = new Axial(selectedCell.q, selectedCell.r).toPixel(
          radius,
          0.5 * radius,
        );
        drawHexagon(ctx, x, y, radius, 10, "red");
      }
    },
    [width, height, radius, selectedCell],
  );

  return <pixiGraphics position={position} scale={scale} draw={drawCallback} />;
}
