import { FederatedPointerEvent, Graphics } from "pixi.js";
import Canvas from "./canvas";
import HexagonalGrid from "./hexagonal-grid";
import { drawHexagon, HEXAGON_RADIUS } from "./shapes";
import { Axial } from "./point";

type LevelEditorInputMode =
  | { type: "panning"; isDragging: boolean }
  | { type: "painting"; isDragging: boolean };

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

  setMode(mode: "panning" | "painting") {
    switch (mode) {
      case "panning":
        this.mode = { type: "panning", isDragging: false };
        break;
      case "painting":
        this.mode = { type: "painting", isDragging: false };
        break;
    }
  }

  private constructor(canvas: Canvas) {
    this.canvas = canvas;
    this.mode = { type: "panning", isDragging: false };

    // draw initial level
    this.level = new HexagonalGrid(32, 32, { weight: 0, graphic: null });
    this.level.forEachCell(({ point, value }) => {
      const ctx = new Graphics({ eventMode: "none" });
      drawHexagon(ctx, point, { stroke: { width: 3, color: 0x353535 } });
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

    if (
      ["panning", "painting"].includes(this.mode.type) &&
      !this.mode.isDragging
    ) {
      this.mode.isDragging = true;
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
      // Convert global screen coords into the render container's local space
      const coords = this.canvas.container.toLocal(event.global);
      const point = Axial.fromPixel(
        coords,
        HEXAGON_RADIUS,
        0.5 * HEXAGON_RADIUS,
      );
      const cell = this.level.getCell(point);
      if (!cell || !cell.value.graphic) {
        return;
      }
      cell.value.graphic.fill("green");
      cell.value.graphic.stroke({ width: 3, color: "lightgray" });
      this.level.setCell(point, { ...cell.value, weight: 1 });
      return;
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
}
