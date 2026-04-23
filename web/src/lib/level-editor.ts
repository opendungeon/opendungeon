import {
  BitmapText,
  FederatedPointerEvent,
  Graphics,
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

export enum RulerType {
  Line = 0,
  Cone,
  Circle,
  Square,
}

export type LevelEditorTerrainMode = {
  terrain?: Terrain;
  strokeWidth: number;
};

export type LevelEditorTextureMode = {
  textureId?: number;
  strokeWidth: number;
};

export type LevelEditorMeasureMode = {
  startPoint?: Axial;
  rulerType?: number;
  altPath?: boolean;
};

export type LevelEditorDecorateMode = {
  objectId?: number;
};

export type LevelEditorMode =
  | {
      view: "measure";
      input: LevelEditorMeasureMode;
      isDragging: boolean;
      button: MouseButton;
    }
  | {
      view: "terrain";
      input: LevelEditorTerrainMode;
      isDragging: boolean;
      button: MouseButton;
    }
  | {
      view: "texture";
      input: LevelEditorTextureMode;
      isDragging: boolean;
      button: MouseButton;
    }
  | {
      view: "decorate";
      input: LevelEditorDecorateMode;
      isDragging: boolean;
      button: MouseButton;
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
  private activeCell: Axial | null = null;
  private activeMeasureShape: {
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
      input: { strokeWidth: 1 },
      view: "texture",
      isDragging: false,
      button: MouseButton.Left,
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

  toggleAltPath(active: boolean) {
    if (this.mode.view !== "measure") {
      return;
    }

    this.setMode({
      ...this.mode,
      input: { ...this.mode.input, altPath: active },
    });

    if (
      this.mode.view === "measure" &&
      this.mode.input.startPoint &&
      this.activeCell
    ) {
      this.paintMeasureShape(
        this.mode.input.startPoint,
        this.activeCell,
        this.mode.input.rulerType ?? RulerType.Line,
      );
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

      this.activeCell = point;

      this.mode.isDragging = true;
      if (this.mode.view === "terrain") {
        if (this.mode.input.terrain === undefined) {
          return;
        }
        this.level.setCell(point, {
          ...cell.value,
          weight: this.mode.input.terrain,
        });

        this.paintCellsInStroke(
          point,
          this.mode.input.strokeWidth,
          this.mode.input.terrain !== Terrain.Empty,
        );
      } else if (this.mode.view === "texture") {
        if (this.mode.input.textureId === undefined) {
          return;
        }

        let weight = cell.value.weight;
        if (this.mode.input.textureId === -1) {
          weight = 0;
        } else if (cell.value.weight === 0) {
          weight = 1;
        }
        this.level.setCell(point, {
          ...cell.value,
          weight,
          textureId: this.mode.input.textureId,
        });

        this.paintCellsInStroke(point, this.mode.input.strokeWidth, false);
      } else if (this.mode.view === "measure") {
        if (this.level.getCell(point)) this.mode.input.startPoint = point;
      }

      return;
    }
  };

  private handlePointerMove = (event: FederatedPointerEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (this.mode.button === MouseButton.Right && this.mode.isDragging) {
      this.canvas.container.position.x += event.movementX;
      this.canvas.container.position.y += event.movementY;
      return;
    }

    if (this.mode.isDragging) {
      const coords = this.canvas.container.toLocal(event.global);
      const point = Hexagon.coordToAxial(coords);

      if (this.activeCell && point.isEqual(this.activeCell)) {
        return;
      }

      this.activeCell = point;

      if (this.mode.view === "terrain") {
        if (this.mode.input.terrain === undefined) {
          return;
        }

        this.paintCellsInStroke(point, this.mode.input.strokeWidth, true);
      } else if (this.mode.view === "texture") {
        if (this.mode.input.textureId === undefined) {
          return;
        }

        this.paintCellsInStroke(point, this.mode.input.strokeWidth, false);
      } else if (
        this.mode.view === "measure" &&
        this.mode.input.rulerType !== undefined
      ) {
        if (this.mode.view === "measure" && this.mode.input.startPoint) {
          const coords = this.canvas.container.toLocal(event.global);
          const point = Hexagon.coordToAxial(coords);
          this.paintMeasureShape(
            this.mode.input.startPoint,
            point,
            this.mode.input.rulerType,
          );
        }
      }

      return;
    }
  };

  private handlePointerUp = (event: FederatedPointerEvent) => {
    event.preventDefault();
    event.stopPropagation();

    this.mode.isDragging = false;

    this.activeCell = null;

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
    if (!this.activeMeasureShape) {
      return;
    }
    this.canvas.container.removeChild(this.activeMeasureShape.line);
    this.activeMeasureShape.line.destroy();
    this.activeMeasureShape.cells.forEach((cell) => {
      this.canvas.container.removeChild(cell.hex);
      this.canvas.container.removeChild(cell.text);

      cell.hex.destroy();
      cell.text.destroy();
    });
    this.activeMeasureShape = null;
  }

  private paintMeasureShape(start: Axial, end: Axial, shape: RulerType) {
    this.destroyMeasureLine();

    const ctx = new Graphics({ eventMode: "none" });
    Line.draw(
      ctx,
      start.toCartesian(Hexagon.xRadius, Hexagon.yRadius),
      end.toCartesian(Hexagon.xRadius, Hexagon.yRadius),
      { stroke: { color: 0xffffff, width: 4, pixelLine: true } },
    );
    this.canvas.container.addChild(ctx);

    const cells =
      shape === RulerType.Line
        ? this.getCellsInLine(start, end)
        : shape === RulerType.Cone
          ? this.getCellsInCone(start, end)
          : shape === RulerType.Circle
            ? this.getCellsInCircle(
                start,
                this.level.calcDistance(start, end, false) + 1,
              )
            : this.getCellsInSquare(start, end);
    const shapeCells: { hex: Graphics; text: BitmapText }[] = [];
    cells.forEach((cell, i) => {
      const hexCtx = new Graphics({ eventMode: "none" });
      Hexagon.draw(hexCtx, cell, {
        fill: { color: 0x00ffff, alpha: 0.5 },
      });
      this.canvas.container.removeChild();
      this.canvas.container.addChild(hexCtx);

      const textSize = 128;
      const textPosition = cell.toCartesian(Hexagon.xRadius, Hexagon.yRadius);
      textPosition.x -= textSize / 4;
      textPosition.y -= textSize / 1.75;
      const textCtx = new BitmapText({
        eventMode: "none",
        text:
          shape === RulerType.Line
            ? i.toString()
            : this.level.calcDistance(start, cell).toString(),
        style: { fill: 0xff9900, fontSize: textSize, fontFamily: "PirataOne" },
        position: textPosition,
      });
      this.canvas.container.addChild(textCtx);

      shapeCells.push({ hex: hexCtx, text: textCtx });
    });

    this.activeMeasureShape = { line: ctx, cells: shapeCells };
  }

  private getCellsInCircle(center: Axial, diameter: number): Axial[] {
    const cells = [];
    diameter = Math.max(0, diameter - 1);
    for (let q = -diameter; q <= diameter; q++) {
      for (
        let r = Math.max(-diameter, -q - diameter);
        r <= Math.min(diameter, -q + diameter);
        r++
      ) {
        cells.push(center.add(new Axial(q, r)));
      }
    }

    return cells.filter((cell) => this.level.getCell(cell));
  }

  private paintCellsInStroke(
    center: Axial,
    strokeWidth: number,
    showTerrain = false,
  ) {
    const points = this.getCellsInCircle(center, strokeWidth);
    for (const p of points) {
      const cell = this.level.getCell(p);
      if (!cell) {
        continue;
      }
      if (this.mode.view === "terrain") {
        if (this.mode.input.terrain === undefined) {
          continue;
        }

        this.level.setCell(p, {
          ...cell.value,
          weight: this.mode.input.terrain,
        });
      } else if (this.mode.view === "texture") {
        if (this.mode.input.textureId === undefined) {
          continue;
        }

        let weight = cell.value.weight;
        if (this.mode.input.textureId === -1) {
          weight = 0;
        } else if (cell.value.weight === 0) {
          weight = 1;
        }
        this.level.setCell(p, {
          ...cell.value,
          textureId: this.mode.input.textureId,
          weight,
        });
      }
      this.paintCell(p, showTerrain);
    }
  }

  private getCellsInLine(start: Axial, end: Axial): Axial[] {
    const cells = [];
    const dist = this.level.calcDistance(start, end);

    if (dist === 0) {
      cells.push(start);
      return cells;
    }

    let startCube = start.toCube();
    let endCube = end.toCube();

    const epsilon =
      this.mode.view === "measure" && this.mode.input.altPath ? -1e-6 : 1e-6;

    startCube = startCube.add(new Cube(epsilon, 2 * epsilon, -3 * epsilon));
    endCube = endCube.add(new Cube(epsilon, 2 * epsilon, -3 * epsilon));

    for (let i = 0; i <= dist; i++) {
      const t = i / dist;
      const interp = startCube.lerp(endCube, t);
      const rounded = Cube.round(interp);
      cells.push(rounded.toAxial());
    }

    return cells;
  }

  private getCellsInCone(start: Axial, end: Axial): Axial[] {
    const lineCells = this.getCellsInLine(start, end);
    if (lineCells.length < 2) {
      return [];
    }

    let cells = [lineCells[1]];
    if (lineCells.length === 2) {
      return cells;
    }

    const startCar = start.toCartesian(Hexagon.xRadius, Hexagon.yRadius);
    const endCar = end.toCartesian(Hexagon.xRadius, Hexagon.yRadius);

    for (let i = 2; i < lineCells.length; i++) {
      const layer = [lineCells[i]];

      for (let j = 0; j < i - 1; j++) {
        try {
          const neighbors =
            startCar.x <= endCar.x
              ? layer[j].getNeighbors()
              : layer[j].getNeighbors().toReversed();
          let neighborsAdded = 0;
          for (const neighbor of neighbors) {
            const distFromStart = this.level.calcDistance(
              start,
              neighbor,
              true,
            );
            const distFromCurrentPoint = this.level.calcDistance(
              lineCells[i],
              neighbor,
              true,
            );

            if (
              !cells.concat(layer).find((cell) => cell.isEqual(neighbor)) &&
              distFromStart === i &&
              distFromCurrentPoint <= i - 1
            ) {
              layer.push(neighbor);

              neighborsAdded++;
              if (neighborsAdded === 2) {
                break;
              }
            }
          }
        } catch {
          break;
        }
      }

      cells = cells.concat(
        layer
          .sort(
            (a, b) =>
              this.level.calcDistance(lineCells[i - 1], a, true) -
              this.level.calcDistance(lineCells[i - 1], b, true),
          )
          .slice(0, i),
      );
    }

    return cells.filter((cell) => this.level.getCell(cell));
  }

  getCellsInSquare(start: Axial, end: Axial): Axial[] {
    const dist = this.level.calcDistance(start, end);

    let cells: Axial[] = [];
    if (dist === 0) {
      cells.push(start);
      return cells;
    }

    if (dist === 1) {
      cells.push(start);
      cells.push(end);

      for (const neighbor of end.getNeighbors()) {
        let neighborsAdded = 0;

        const distFromStart = this.level.calcDistance(start, neighbor);
        const distFromEnd = this.level.calcDistance(end, neighbor);

        if (distFromStart === 1 && distFromEnd === 1) {
          cells.push(neighbor);

          neighborsAdded += 1;
          if (neighborsAdded === 2) break;
        }
      }

      return cells;
    }

    const centerOffset = Math.floor(dist / 2);

    for (let row = 0; row <= dist; row++) {
      for (let col = 0; col <= dist; col++) {
        const q =
          start.q -
          centerOffset +
          col +
          -1 * Math.floor(row / 2) +
          1 * Math.floor(dist / 4);
        const r = start.r - centerOffset + row;
        const cell = new Axial(q, r);

        cells.push(cell);
      }
    }

    return cells.filter((cell) => this.level.getCell(cell));
  }
}
