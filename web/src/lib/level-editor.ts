import { FederatedPointerEvent, Graphics } from "pixi.js";
import Canvas from "./canvas";
import HexagonalGrid from "./hexagonal-grid";
import Hexagon, { type HexagonStyle } from "./hexagon";
import type { Axial } from "./point";

const LEFT_MOUSE_BUTTON = 0;

enum Brush {
  Eraser = 0,
  Normal,
  Difficult,
}

const EMPTY_CELL_STYLE: HexagonStyle = {
  fill: 0x000000,
  stroke: { width: 4, color: 0x353535 },
};

export type LevelEditorInputMode =
  | { type: "panning"; isDragging: boolean }
  | { type: "painting"; isDragging: boolean; brush: Brush };

export default class LevelEditor {
  private canvas: Canvas;
  private level: HexagonalGrid<{ weight: number; graphic: Graphics | null }>;
  private mode: LevelEditorInputMode;

  static async create(element: HTMLElement): Promise<LevelEditor> {
    const canvas = await Canvas.create(element);
    return new LevelEditor(canvas);
  }

  setScale(scale: number) {
    this.canvas.container.scale = scale;
  }

  setMode(mode: LevelEditorInputMode) {
    this.mode = mode;
  }

  private constructor(canvas: Canvas) {
    this.canvas = canvas;
    this.mode = { type: "panning", isDragging: false };

    this.level = new HexagonalGrid(32, 32, { weight: 0, graphic: null });

    // draw grid outline
    this.level.cells.forEach(({ point }) => {
      const ctx = new Graphics({ eventMode: "none" });
      Hexagon.draw(ctx, point, EMPTY_CELL_STYLE);
      this.canvas.container.addChild(ctx);
    });

    // draw initial level
    this.level.cells.forEach(({ point, value }) => {
      const ctx = new Graphics({ eventMode: "none" });
      Hexagon.draw(ctx, point);
      ctx.alpha = 0;
      this.canvas.container.addChild(ctx);
      this.level.setCell(point, { ...value, graphic: ctx });
    });

    this.canvas.interactor.on("pointerdown", this.handlePointerDown);
    this.canvas.interactor.on("pointermove", this.handlePointerMove);
    this.canvas.interactor.on("pointerup", this.handlePointerUp);
  }

  private handlePointerDown = (event: FederatedPointerEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.button !== LEFT_MOUSE_BUTTON) {
      return;
    }

    if (
      ["panning", "painting"].includes(this.mode.type) &&
      !this.mode.isDragging
    ) {
      this.mode.isDragging = true;
      const coords = this.canvas.container.toLocal(event.global);
      const point = Hexagon.coordToAxial(coords);
      this.paintCell(point);
      return;
    }
  };

  private handlePointerMove = (event: FederatedPointerEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (this.mode.type == "panning" && this.mode.isDragging) {
      this.canvas.container.position.x += event.movementX;
      this.canvas.container.position.y += event.movementY;
      return;
    }

    if (this.mode.type == "painting" && this.mode.isDragging) {
      const coords = this.canvas.container.toLocal(event.global);
      const point = Hexagon.coordToAxial(coords);
      this.paintCell(point);
    }
  };

  private handlePointerUp = (event: FederatedPointerEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (["panning", "painting"].includes(this.mode.type)) {
      this.mode.isDragging = false;
      return;
    }
  };

  private paintCell(point: Axial) {
    if (this.mode.type !== "painting") {
      return;
    }

    const cell = this.level.getCell(point);
    if (!cell || !cell.value.graphic) {
      return;
    }

    switch (this.mode.brush) {
      case Brush.Eraser:
        cell.value.graphic.alpha = 0;
        break;
      case Brush.Normal:
        cell.value.graphic.alpha = 1;
        cell.value.graphic.fill("green");
        cell.value.graphic.stroke({ width: 4, color: "lightgray" });
        break;
      case Brush.Difficult:
        cell.value.graphic.alpha = 1;
        cell.value.graphic.fill("yellow");
        cell.value.graphic.stroke({ width: 4, color: "lightgray" });
        break;
    }
    this.level.setCell(point, { ...cell.value, weight: this.mode.brush });
    return;
  }
}
