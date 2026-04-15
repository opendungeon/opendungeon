import {
  BitmapText,
  FederatedPointerEvent,
  Graphics,
  Point,
  Texture,
  type FillStyle,
} from "pixi.js";
import Canvas from "./canvas";
import HexagonalGrid from "./hexagonal-grid";
import Hexagon from "./hexagon";
import { Axial, Cube } from "./point";
import Line from "./line";

export enum MouseButton {
  Left = 0,
  Middle,
  Right,
}

export enum Terrain {
  Empty = 0,
  Normal,
  Difficult,
}

export type LevelEditorTerrainMode = {
  button: MouseButton;
  terrain?: Terrain;
  strokeWidth: number;
};

export type LevelEditorTextureMode = {
  button: MouseButton;
  textureId?: number;
  strokeWidth: number;
};

export type LevelEditorMeasureMode = {
  button: MouseButton;
  startPoint?: Axial;
  rulerType?: number;
};

export type LevelEditorDecorateMode = {
  button: MouseButton;
  objectId?: number;
};

export type LevelEditorMode =
  | {
      view: "measure";
      input: LevelEditorMeasureMode;
      isDragging: boolean;
    }
  | {
      view: "terrain";
      input: LevelEditorTerrainMode;
      isDragging: boolean;
    }
  | {
      view: "texture";
      input: LevelEditorTextureMode;
      isDragging: boolean;
    }
  | {
      view: "decorate";
      input: LevelEditorDecorateMode;
      isDragging: boolean;
    };

export default class LevelEditor {
  private canvas: Canvas;
  private level: HexagonalGrid<{
    weight: number;
    graphic: Graphics | null;
    textureId: number;
  }>;
  private mode: LevelEditorMode;
  private textures: Texture[];
  private activeMeasureLine: {
    line: Graphics;
    cells: {
      hex: Graphics;
      text: BitmapText;
    }[];
  } | null = null;

  static async create(
    element: HTMLElement,
    textures: Texture[],
  ): Promise<LevelEditor> {
    const canvas = await Canvas.create(element);
    return new LevelEditor(canvas, textures);
  }

  private constructor(canvas: Canvas, textures: Texture[]) {
    this.canvas = canvas;
    this.textures = textures;
    this.mode = {
      input: { button: MouseButton.Left, strokeWidth: 1 },
      view: "texture",
      isDragging: false,
    };

    this.level = new HexagonalGrid(32, 32, {
      weight: 0,
      graphic: null,
      textureId: -1,
    });

    // draw grid outline
    this.level.cells.forEach(({ point }) => {
      const ctx = new Graphics({ eventMode: "none" });
      Hexagon.draw(ctx, point, {
        fill: { color: 0x111111 },
        stroke: { color: 0x707070, width: 4, pixelLine: true },
      });
      this.canvas.container.addChild(ctx);
    });

    // draw initial level
    this.level.cells.forEach(({ point, value }) => {
      const ctx = new Graphics({ eventMode: "none" });
      Hexagon.draw(ctx, point, { fill: { alpha: 0 } });
      this.canvas.container.addChild(ctx);
      this.level.setCell(point, { ...value, graphic: ctx });
    });

    this.canvas.interactor.on("pointerdown", this.handlePointerDown);
    this.canvas.interactor.on("pointermove", this.handlePointerMove);
    this.canvas.interactor.on("pointerup", this.handlePointerUp);
    this.canvas.interactor.on("pointerleave", this.handlePointerUp);
  }

  private getTexture(id: number): Texture | undefined {
    return id < 0 ? undefined : this.textures.at(id);
  }

  setScale(scale: number) {
    this.canvas.container.scale = scale;
  }

  setMode(mode: LevelEditorMode) {
    const prevView = this.mode.view;
    const newView = mode.view;
    this.mode = mode;

    if (prevView !== "terrain" && newView === "terrain") {
      this.level.cells.forEach(({ point, value }) => {
        if (!value.graphic) {
          return;
        }

        if (!value.weight) {
          return;
        }

        this.paintCell(point, true);
      });
      return;
    }

    if (prevView !== "texture" && newView === "texture") {
      this.level.cells.forEach(({ point, value }) => {
        if (!value.graphic || !value.weight) {
          return;
        }

        this.paintCell(point, false);
      });
      return;
    }
  }

  private handlePointerDown = (event: FederatedPointerEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.button !== MouseButton.Left) {
      return;
    }

    if (!this.mode.isDragging) {
      const coords = this.canvas.container.toLocal(event.global);
      const point = Hexagon.coordToAxial(coords);
      const cell = this.level.getCell(point);
      if (!cell) {
        return;
      }

      this.mode.isDragging = true;
      if (this.mode.view === "terrain") {
        if (this.mode.input.terrain === undefined) {
          return;
        }
        this.level.setCell(point, {
          ...cell.value,
          weight: this.mode.input.terrain,
        });
        this.paintCell(point, true);
      } else if (this.mode.view === "texture") {
        if (this.mode.input.textureId === undefined) {
          return;
        }
        this.level.setCell(point, {
          ...cell.value,
          weight: cell.value.weight === 0 ? 1 : cell.value.weight,
          textureId: this.mode.input.textureId,
        });
        this.paintCell(point, false);
      } else if (this.mode.view === "measure") {
        this.mode.input.startPoint = point;
      }

      return;
    }
  };

  private handlePointerMove = (event: FederatedPointerEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (this.mode.input?.button === MouseButton.Right && this.mode.isDragging) {
      this.canvas.container.position.x += event.movementX;
      this.canvas.container.position.y += event.movementY;
      return;
    }

    if (this.mode.isDragging) {
      const coords = this.canvas.container.toLocal(event.global);
      const point = Hexagon.coordToAxial(coords);

      if (this.mode.view === "terrain") {
        if (this.mode.input.terrain === undefined) {
          return;
        }
        const points = this.getCellsForPainting(
          point,
          this.mode.input.strokeWidth,
        );
        console.log(points);
        for (const p of points) {
          const cell = this.level.getCell(p);
          if (!cell) {
            continue;
          }
          this.level.setCell(p, {
            ...cell.value,
            weight: this.mode.input.terrain,
          });
          this.paintCell(p, true);
        }
      } else if (this.mode.view === "texture") {
        if (this.mode.input.textureId === undefined) {
          return;
        }
        const points = this.getCellsForPainting(
          point,
          this.mode.input.strokeWidth,
        );
        for (const p of points) {
          const cell = this.level.getCell(p);
          if (!cell) {
            continue;
          }
          this.level.setCell(p, {
            ...cell.value,
            textureId: this.mode.input.textureId,
            weight: cell.value.weight === 0 ? 1 : cell.value.weight,
          });
          this.paintCell(p, false);
        }
      } else if (this.mode.view === "measure") {
        if (this.mode.view === "measure" && this.mode.input.startPoint) {
          const coords = this.canvas.container.toLocal(event.global);
          const point = Hexagon.coordToAxial(coords);

          this.paintMeasureLine(this.mode.input.startPoint, point);
        }
      }

      return;
    }
  };

  private handlePointerUp = (event: FederatedPointerEvent) => {
    event.preventDefault();
    event.stopPropagation();

    this.mode.isDragging = false;

    this.destroyMeasureLine();
  };

  private paintCell(point: Axial, showTerrain = false) {
    const cell = this.level.getCell(point);
    if (!cell || !cell.value.graphic) {
      return;
    }

    const texture = this.getTexture(cell.value.textureId);
    let fill: FillStyle | undefined;

    if (showTerrain) {
      switch (cell.value.weight) {
        case Terrain.Normal:
          fill = { color: "green" };
          break;
        case Terrain.Difficult:
          fill = { color: "yellow" };
          break;
      }
    }

    if (!texture && !fill) {
      fill = { alpha: 0 };
    }

    cell.value.graphic.clear();

    cell.value.graphic = Hexagon.draw(cell.value.graphic, point, {
      fill,
      texture,
    });
  }

  private destroyMeasureLine() {
    if (!this.activeMeasureLine) {
      return;
    }
    this.canvas.container.removeChild(this.activeMeasureLine.line);
    this.activeMeasureLine.cells.forEach((cell) => {
      this.canvas.container.removeChild(cell.hex);
      this.canvas.container.removeChild(cell.text);
    });
    this.activeMeasureLine = null;
  }

  private paintMeasureLine(start: Axial, end: Axial) {
    this.destroyMeasureLine();
    const ctx = new Graphics({ eventMode: "none" });
    Line.draw(
      ctx,
      start.toCartesian(Hexagon.xRadius, Hexagon.yRadius),
      end.toCartesian(Hexagon.xRadius, Hexagon.yRadius),
      { stroke: { color: 0xffffff, width: 4, pixelLine: true } },
    );
    this.canvas.container.addChild(ctx);
    const lineCells = [];
    const dist = this.level.calcDistance(start, end);
    for (let i = 0; i <= dist; i++) {
      const t = dist === 0 ? 0 : i / dist;
      const interp = start.toCube().lerp(end.toCube(), t).toAxial();
      const rounded = Axial.round(interp);
      const hexCtx = new Graphics({ eventMode: "none" });
      Hexagon.draw(hexCtx, rounded, {
        fill: { color: 0x00ffff, alpha: 0.5 },
      });
      this.canvas.container.addChild(hexCtx);

      const textSize = 128;
      const textPosition = rounded.toCartesian(
        Hexagon.xRadius,
        Hexagon.yRadius,
      );
      textPosition.x -= textSize / 4;
      textPosition.y -= textSize / 1.75;

      const textCtx = new BitmapText({
        eventMode: "none",
        text: String(i),
        style: { fill: 0xff9900, fontSize: textSize, fontFamily: "PirataOne" },
        position: textPosition,
      });
      this.canvas.container.addChild(textCtx);
      lineCells.push({ hex: hexCtx, text: textCtx });
    }
    this.activeMeasureLine = { line: ctx, cells: lineCells };
  }

  private getCellsForPainting(center: Axial, strokeWidth: number): Axial[] {
    const cells = [center];
    strokeWidth = Math.max(0, strokeWidth - 1);
    console.log("strokeWidth", strokeWidth);
    for (let q = -strokeWidth; q <= strokeWidth; q++) {
      for (
        let r = Math.max(-strokeWidth, -q - strokeWidth);
        r <= Math.min(strokeWidth, -q + strokeWidth);
        r++
      ) {
        cells.push(center.add(new Axial(q, r)));
      }
    }

    return cells;
  }
}
