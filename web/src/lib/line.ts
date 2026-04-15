import { type Graphics, type StrokeStyle } from "pixi.js";
import { Cartesian } from "./point";

export default class Line {
  static draw(
    ctx: Graphics,
    start: Cartesian,
    end: Cartesian,
    style: { stroke?: StrokeStyle } = {},
  ): Graphics {
    ctx.moveTo(start.x, start.y).lineTo(end.x, end.y).stroke(style.stroke);
    return ctx;
  }
}
