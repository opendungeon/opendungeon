import {
  FederatedPointerEvent,
  Graphics,
  Texture,
  type FillStyle,
} from "pixi.js";
import Canvas from "./canvas";
import HexagonalGrid from "./hexagonal-grid";
import Hexagon from "./hexagon";
import type { Axial } from "./point";

const LEFT_MOUSE_BUTTON = 0;

export enum Terrain {
  Empty = 0,
  Normal,
  Difficult,
}

export type LevelEditorTerrainMode =
  | { type: "panning"; isDragging: boolean }
  | { type: "painting"; isDragging: boolean; terrain: Terrain };

export type LevelEditorTextureMode =
  | { type: "panning"; isDragging: boolean }
  | { type: "painting"; isDragging: boolean; textureId: number };

export type LevelEditorMeasureMode =
  | { type: "panning"; isDragging: boolean }
  | { type: "painting"; isDragging: boolean; rulerType: number };

export type LevelEditorObjectMode =
  | { type: "panning"; isDragging: boolean }
  | { type: "painting"; isDragging: boolean; objectId: number };

export type LevelEditorMode =
  | {
      view: "measure";
      input: LevelEditorMeasureMode;
    }
  | {
      view: "terrain";
      input: LevelEditorTerrainMode;
    }
  | {
      view: "texture";
      input: LevelEditorTextureMode;
    }
  | {
      view: "object";
      input: LevelEditorObjectMode;
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
      view: "texture",
      input: { type: "panning", isDragging: false },
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

    if (event.button !== LEFT_MOUSE_BUTTON) {
      return;
    }

    if (this.mode.input.type === "panning") {
      this.mode.input.isDragging = true;
      return;
    }

    if (this.mode.input.type === "painting" && !this.mode.input.isDragging) {
      const coords = this.canvas.container.toLocal(event.global);
      const point = Hexagon.coordToAxial(coords);
      const cell = this.level.getCell(point);
      if (!cell) {
        return;
      }

      this.mode.input.isDragging = true;
      if (this.mode.view === "terrain") {
        this.level.setCell(point, {
          ...cell.value,
          weight: this.mode.input.terrain,
        });
        this.paintCell(point, true);
      } else if (this.mode.view === "texture") {
        this.level.setCell(point, {
          ...cell.value,
          weight: cell.value.weight === 0 ? 1 : cell.value.weight,
          textureId: this.mode.input.textureId,
        });
        this.paintCell(point, false);
      }

      return;
    }
  };

  private handlePointerMove = (event: FederatedPointerEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (this.mode.input.type == "panning" && this.mode.input.isDragging) {
      this.canvas.container.position.x += event.movementX;
      this.canvas.container.position.y += event.movementY;
      return;
    }

    if (this.mode.input.type == "painting" && this.mode.input.isDragging) {
      const coords = this.canvas.container.toLocal(event.global);
      const point = Hexagon.coordToAxial(coords);
      const cell = this.level.getCell(point);
      if (!cell) {
        return;
      }

      if (this.mode.view === "terrain") {
        this.level.setCell(point, {
          ...cell.value,
          weight: this.mode.input.terrain,
        });
        this.paintCell(point, true);
      } else if (this.mode.view === "texture") {
        this.level.setCell(point, {
          ...cell.value,
          weight: cell.value.weight === 0 ? 1 : cell.value.weight,
          textureId: this.mode.input.textureId,
        });
        this.paintCell(point, false);
      }
      return;
    }
  };

  private handlePointerUp = (event: FederatedPointerEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (["panning", "painting"].includes(this.mode.input.type)) {
      this.mode.input.isDragging = false;
      return;
    }
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
}
