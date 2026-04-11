import type { ColorSource, FillInput, Graphics, ImageSource } from "pixi.js";
import type { Axial } from "./point";

export const HEXAGON_RADIUS = 200;

type HexagonStyle = {
  texture?: ImageSource;
  fill?: ColorSource;
  stroke?: {
    color: ColorSource;
    width: number;
  };
};

type LineStyle = {
  width: number;
  color: ColorSource;
};

export function drawLine(
  ctx: Graphics,
  start: Axial,
  end: Axial,
  style: LineStyle,
) {
  const pixelStart = start.toPixel(HEXAGON_RADIUS, 0.5 * HEXAGON_RADIUS);
  const pixelEnd = end.toPixel(HEXAGON_RADIUS, 0.5 * HEXAGON_RADIUS);
  ctx
    .moveTo(pixelStart.x, pixelStart.y)
    .lineTo(pixelEnd.x, pixelEnd.y)
    .stroke(style);
}

export function drawHexagon(
  ctx: Graphics,
  position: Axial,
  style: HexagonStyle,
) {
  const { x, y } = position.toPixel(HEXAGON_RADIUS, 0.5 * HEXAGON_RADIUS);

  if (style.stroke) {
    ctx.setStrokeStyle({
      width: style.stroke.width,
      color: style.stroke.color,
    });
  }

  if (style.fill) {
    ctx.setFillStyle({ color: style.fill });
  }

  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
    const vx = HEXAGON_RADIUS * Math.cos(angle) + x;
    const vy = 0.5 * HEXAGON_RADIUS * Math.sin(angle) + y;

    points.push(vx);
    points.push(vy);
  }

  ctx.poly(points);

  if (style.fill || style.texture) {
    ctx.fill(style.texture as FillInput);
  }
  if (style.stroke) {
    ctx.stroke();
  }
}
