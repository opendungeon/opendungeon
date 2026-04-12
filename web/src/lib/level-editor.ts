import {
  Assets,
  FederatedPointerEvent,
  Graphics,
  ImageSource,
  type FillInput,
} from "pixi.js";
import Canvas from "./canvas";
import HexagonalGrid from "./hexagonal-grid";
import Hexagon, { type HexagonStyle } from "./hexagon";
import type { Axial } from "./point";
import waterTexture from "../assets/water.jpg";
import grassTexture from "../assets/grass.png";
import stoneTexture from "../assets/cobble.jpg";
import mudTexture from "../assets/mud.jpg";

const LEFT_MOUSE_BUTTON = 0;

export enum Brush {
  Eraser = 0,
  Normal,
  Difficult,
}

const EMPTY_CELL_STYLE: HexagonStyle = {
  fill: 0x000000,
  stroke: { width: 4, color: 0x353535 },
};

export type LevelEditorTerrainMode =
  | { type: "panning"; isDragging: boolean }
  | { type: "painting"; isDragging: boolean; brush: Brush };

export type LevelEditorTextureMode =
  | { type: "panning"; isDragging: boolean }
  | { type: "painting"; isDragging: boolean; texture: string };

export type LevelEditorMode =
  | {
      view: "terrain";
      input: LevelEditorTerrainMode;
    }
  | {
      view: "texture";
      input: LevelEditorTextureMode;
    };

export default class LevelEditor {
  private canvas: Canvas;
  private level: HexagonalGrid<{
    weight: number;
    graphic: Graphics | null;
    texture: string;
  }>;
  private mode: LevelEditorMode;
  private textures: Record<string, ImageSource>;

  static async create(element: HTMLElement): Promise<LevelEditor> {
    const canvas = await Canvas.create(element);
    const textures = await Assets.load([
      waterTexture,
      grassTexture,
      stoneTexture,
      mudTexture,
    ]);
    return new LevelEditor(canvas, textures);
  }

  setScale(scale: number) {
    this.canvas.container.scale = scale;
  }

  setMode(mode: LevelEditorMode) {
    this.mode = mode;
    if (mode.view === "terrain") {
      this.level.cells.forEach((cell) => {
        if (!cell.value.graphic) {
          return;
        }
        console.log("cell weight", cell.value.weight);
        if (cell.value.weight === Brush.Normal) {
          console.log("setting cell to normal");
          this.paintCell(cell.point, cell.value.texture, Brush.Normal); 
        } else if (cell.value.weight === Brush.Difficult) {
          console.log("setting cell to difficult");
          cell.value.graphic.clear();
          this.paintCell(cell.point, cell.value.texture, Brush.Difficult);
        }
      });
    }
  }

  private constructor(canvas: Canvas, textures: Record<string, ImageSource>) {
    this.canvas = canvas;
    this.textures = textures;
    this.mode = {
      view: "texture",
      input: { type: "panning", isDragging: false },
    };

    this.level = new HexagonalGrid(32, 32, {
      weight: 0,
      graphic: null,
      texture: "grass.jpg",
    });

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
    this.canvas.interactor.on("pointerleave", this.handlePointerUp);
  }

  private handlePointerDown = (event: FederatedPointerEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.button !== LEFT_MOUSE_BUTTON) {
      return;
    }

    if (
      ["panning", "painting"].includes(this.mode.input.type) &&
      !this.mode.input.isDragging
    ) {
      this.mode.input.isDragging = true;
      const coords = this.canvas.container.toLocal(event.global);
      const point = Hexagon.coordToAxial(coords);
      this.paintCell(point);
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
      if (this.mode.view === "terrain") {
        this.paintCell(point, undefined, this.mode.input.brush);
      } else {
        this.paintCell(point, this.mode.input.texture);
      }
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

  private paintCell(point: Axial, texture?: string, terrain?: Brush) {
    if (this.mode.input.type !== "painting") {
      return;
    }

    const cell = this.level.getCell(point);
    if (!cell || !cell.value.graphic) {
      return;
    }

    cell.value.graphic.clear();

    console.log(
      this.textures[
        "/src/assets/" + (!texture ? cell.value.texture : texture!)
      ],
    );

    Hexagon.draw(cell.value.graphic, point, {
      texture:
        this.textures[
          "/src/assets/" + (!texture ? cell.value.texture : texture!)
        ],
      color: !terrain
        ? undefined
        : terrain === Brush.Normal
          ? "green"
          : "yellow",
    });
  }
}
