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

  static draw(ctx: Graphics, position: Axial, style?: HexagonStyle) {
    const { x, y } = position.toPixel(Hexagon.xRadius, Hexagon.yRadius);

    if (style?.stroke) {
      ctx.setStrokeStyle({
        width: style.stroke.width,
        color: style.stroke.color,
      });
    }

    if (style?.fill) {
      ctx.setFillStyle({ color: style.fill });
    }

    const points: number[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
      const vx = Hexagon.xRadius * Math.cos(angle) + x;
      const vy = Hexagon.yRadius * Math.sin(angle) + y;

      points.push(vx);
      points.push(vy);
    }

    ctx.poly(points);

    if (style?.fill || style?.texture) {
      ctx.fill(style.texture as FillInput);
    }
    if (style?.stroke) {
      ctx.stroke();
    }
  }

  static coordToAxial(coords: { x: number; y: number }): Axial {
    return Axial.fromPixel(coords, Hexagon.xRadius, Hexagon.yRadius);
  }
}
