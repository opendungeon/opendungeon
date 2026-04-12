import type { ColorSource, FillInput, Graphics, ImageSource } from "pixi.js";
import { Axial } from "./point";

export type HexagonStyle = {
  texture?: ImageSource;
  fill?: ColorSource;
  stroke?: {
    color: ColorSource;
    width: number;
  };
};

export default class Hexagon {
  static xRadius = 200;
  static yRadius = 100;

  static draw(ctx: Graphics, position: Axial, style?: FillInput) {
    const { x, y } = position.toPixel(Hexagon.xRadius, Hexagon.yRadius);

    const points: number[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
      const vx = Hexagon.xRadius * Math.cos(angle) + x;
      const vy = Hexagon.yRadius * Math.sin(angle) + y;

      points.push(vx);
      points.push(vy);
    }

    ctx.poly(points);

    ctx.fill(style)
  }

  static coordToAxial(coords: { x: number; y: number }): Axial {
    return Axial.fromPixel(coords, Hexagon.xRadius, Hexagon.yRadius);
  }
}
