import { type FillStyle, Graphics, Texture, type StrokeStyle } from "pixi.js";
import { Axial } from "./point";

export default class Hexagon {
  static xRadius = 200;
  static yRadius = 100;

  static draw(
    ctx: Graphics,
    position: Axial,
    style: { fill?: FillStyle; stroke?: StrokeStyle; texture?: Texture } = {},
  ): Graphics {
    const { x, y } = position.toCartesian(Hexagon.xRadius, Hexagon.yRadius);

    const points: number[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
      const vx = Hexagon.xRadius * Math.cos(angle) + x;
      const vy = Hexagon.yRadius * Math.sin(angle) + y;

      points.push(vx);
      points.push(vy);
    }

    ctx
      .poly(points)
      .fill(
        !style.texture ? style.fill : { ...style.fill, texture: style.texture },
      )
      .stroke(style.stroke);

    return ctx;
  }

  static coordToAxial(coords: { x: number; y: number }): Axial {
    return Axial.fromCartesian(coords, Hexagon.xRadius, Hexagon.yRadius);
  }
}
