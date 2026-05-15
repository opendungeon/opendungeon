import {
  BitmapText,
  DOMContainer,
  FederatedPointerEvent,
  Graphics,
  Text,
  Texture,
  type FillStyle,
  type TextStyleOptions,
} from "pixi.js";
import Canvas from "./canvas";
import HexagonalGrid from "./hexagonal-grid";
import Hexagon from "./hexagon";
import { Axial, Cartesian, Cube } from "./point";
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
  rulerType?: RulerType;
  altPath?: boolean;
};

export type LevelEditorDecorateMode = {
  objectId?: number;
};

export type LevelEditorTextMode = {
  textStyle: TextStyleOptions;
  activeText: DOMContainer | null;
};

export type LevelEditorSelectMode = {
  startPoint?: Cartesian;
};

export type LevelEditorMode =
  | {
      view: "measure";
      input: LevelEditorMeasureMode;
      isDragging: boolean;
      button: MouseButton;
      cursor: string;
    }
  | {
      view: "terrain";
      input: LevelEditorTerrainMode;
      isDragging: boolean;
      button: MouseButton;
      cursor: string;
    }
  | {
      view: "texture";
      input: LevelEditorTextureMode;
      isDragging: boolean;
      button: MouseButton;
      cursor: string;
    }
  | {
      view: "decorate";
      input: LevelEditorDecorateMode;
      isDragging: boolean;
      button: MouseButton;
      cursor: string;
    }
  | {
      view: "text";
      input: LevelEditorTextMode;
      isDragging: boolean;
      button: MouseButton;
      cursor: string;
    }
  | {
      view: "select";
      input: LevelEditorSelectMode;
      isDragging: boolean;
      button: MouseButton;
      cursor: string;
    };

export default class LevelEditor {
  private state: {
    canvas: Canvas;
    level: HexagonalGrid<{
      weight: number;
      graphic: Graphics | null;
      textureId: number;
    }>;
    mode: LevelEditorMode;
    textures: Texture[];
    activeCell: Axial | null;
    activeMeasureShape: {
      line: Graphics;
      cells: {
        hex: Graphics;
        text: BitmapText;
      }[];
    } | null;
    activeSelectArea: Graphics | null;
    selectedItems: Map<number, Graphics | Text>;
    texts: Text[];
  };

  private listeners = new Set<() => void>();

  static async create(
    element: HTMLElement,
    textures: Texture[],
  ): Promise<LevelEditor> {
    const canvas = await Canvas.create(element);
    return new LevelEditor(canvas, textures);
  }

  private constructor(canvas: Canvas, textures: Texture[]) {
    this.state = {
      canvas,
      textures,
      mode: {
        input: { strokeWidth: 1 },
        view: "texture",
        isDragging: false,
        button: MouseButton.Left,
        cursor: "default",
      },
      texts: [],
      selectedItems: new Map<number, Graphics | Text>(),
      level: new HexagonalGrid(32, 32, {
        weight: 0,
        graphic: null,
        textureId: -1,
      }),
      activeCell: null,
      activeMeasureShape: null,
      activeSelectArea: null,
    };

    // draw grid outline
    this.state.level.cells.forEach(({ point }) => {
      const ctx = new Graphics({ eventMode: "none" });
      Hexagon.draw(ctx, point, {
        fill: { color: 0x111111 },
        stroke: { color: 0x707070, width: 4, pixelLine: true },
      });
      this.state.canvas.container.addChild(ctx);
    });

    // draw initial level
    this.state.level.cells.forEach(({ point, value }) => {
      const ctx = new Graphics({ eventMode: "none" });
      Hexagon.draw(ctx, point, { fill: { alpha: 0 } });
      this.state.canvas.container.addChild(ctx);
      this.state.level.setCell(point, { ...value, graphic: ctx });
    });

    this.state.canvas.interactor.on("pointerdown", this.handlePointerDown);
    this.state.canvas.interactor.on("pointermove", this.handlePointerMove);
    this.state.canvas.interactor.on("pointerup", this.handlePointerUp);
    this.state.canvas.interactor.on("pointerenter", this.handlePointerUp);
  }

  getState() {
    return this.state;
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  clear() {
    this.listeners.clear();
  }

  private getTexture(id: number): Texture | undefined {
    return id < 0 ? undefined : this.state.textures.at(id);
  }

  setCursor(newCursor: string) {
    this.state.canvas.interactor.cursor = newCursor;
  }

  getActiveText(): DOMContainer | null {
    return this.state.mode.view === "text"
      ? this.state.mode.input.activeText
      : null;
  }

  setScale(scale: number) {
    this.state.canvas.container.scale = scale;
  }

  setMode(mode: LevelEditorMode) {
    const prevView = this.state.mode.view;
    const newView = mode.view;

    if (
      prevView === "text" &&
      mode.view !== "text" &&
      this.state.mode.input.activeText
    ) {
      this.state.mode.input.activeText.parent?.removeChild(
        this.state.mode.input.activeText,
      );
      this.state.mode.input.activeText.destroy(true);
      this.state.mode.input.activeText = null;
    }

    this.state.mode = mode;
    this.setCursor(mode.cursor);

    if (prevView !== "terrain" && newView === "terrain") {
      this.state.level.cells.forEach(({ point, value }) => {
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
      this.state.level.cells.forEach(({ point, value }) => {
        if (!value.graphic || !value.weight) {
          return;
        }

        this.paintCell(point, false);
      });
      return;
    }

    this.notify();
  }

  toggleAltPath(active: boolean) {
    if (this.state.mode.view !== "measure") {
      return;
    }

    this.setMode({
      ...this.state.mode,
      input: { ...this.state.mode.input, altPath: active },
    });

    if (this.state.mode.input.startPoint && this.state.activeCell) {
      this.paintMeasureShape(
        this.state.mode.input.startPoint,
        this.state.activeCell,
        this.state.mode.input.rulerType ?? RulerType.Line,
      );
    }
  }

  private handlePointerDown = (event: FederatedPointerEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.button !== MouseButton.Left) {
      return;
    }

    if (!this.state.mode.isDragging) {
      const coords = this.state.canvas.container.toLocal(event.global);
      const point = Hexagon.coordToAxial(coords);

      if (this.state.mode.view === "select") {
        this.state.mode.input.startPoint = new Cartesian(coords.x, coords.y);
      }

      const cell = this.state.level.getCell(point);
      if (!cell) {
        return;
      }

      this.state.activeCell = point;

      this.state.mode.isDragging = true;
      if (this.state.mode.view === "terrain") {
        if (this.state.mode.input.terrain === undefined) {
          return;
        }
        this.state.level.setCell(point, {
          ...cell.value,
          weight: this.state.mode.input.terrain,
        });

        this.paintCellsInStroke(
          point,
          this.state.mode.input.strokeWidth,
          this.state.mode.input.terrain !== Terrain.Empty,
        );
      } else if (this.state.mode.view === "texture") {
        if (this.state.mode.input.textureId === undefined) {
          return;
        }

        let weight = cell.value.weight;
        if (this.state.mode.input.textureId === -1) {
          weight = 0;
        } else if (cell.value.weight === 0) {
          weight = 1;
        }
        this.state.level.setCell(point, {
          ...cell.value,
          weight,
          textureId: this.state.mode.input.textureId,
        });

        this.paintCellsInStroke(
          point,
          this.state.mode.input.strokeWidth,
          false,
        );
      } else if (this.state.mode.view === "measure") {
        if (this.state.level.getCell(point))
          this.state.mode.input.startPoint = point;
      } else if (this.state.mode.view === "text") {
        if (this.state.mode.input.activeText) {
          const textElement = this.state.mode.input.activeText
            .element as HTMLTextAreaElement;
          if (textElement.value.trim() !== "") {
            const textCtx = new Text({
              eventMode: "dynamic",
              text: textElement.value,
              style: {
                fill: this.state.mode.input.textStyle.fill,
                fontSize: textElement.style.fontSize,
                fontFamily: "PirataOne",
              },
              position: this.state.mode.input.activeText.position,
            });
            this.state.canvas.container.addChild(textCtx);
            this.state.texts.push(textCtx);
          }
          this.state.mode.input.activeText.destroy(true);
          this.state.mode.input.activeText = null;
        }
        const textarea = document.createElement("textarea");
        textarea.wrap = "off";
        textarea.style.resize = "both";
        textarea.style.position = "absolute";
        textarea.style.zIndex = "50";
        textarea.style.fontSize = this.state.mode.input.textStyle.fontSize
          ? String(this.state.mode.input.textStyle.fontSize)
          : "64px";
        textarea.style.fontFamily = "PirataOne";
        textarea.style.color = this.state.mode.input.textStyle.fill
          ? this.state.mode.input.textStyle.fill.toString()
          : "white";

        const domContainer = new DOMContainer({
          element: textarea,
          anchor: { x: 0, y: 0 },
        });

        const localPosition = this.state.canvas.container.toLocal(event.global);

        domContainer.position.set(
          localPosition.x,
          localPosition.y - Number(textarea.style.fontSize.replace("px", "")),
        );

        this.state.canvas.container.addChild(domContainer);
        this.state.mode.input.activeText = domContainer;

        setTimeout(() => (domContainer.element.focus(), 25));
      }

      return;
    }
  };

  private handlePointerMove = (event: FederatedPointerEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (
      this.state.mode.button === MouseButton.Right &&
      this.state.mode.isDragging
    ) {
      this.state.canvas.container.position.x += event.movementX;
      this.state.canvas.container.position.y += event.movementY;
      return;
    }

    if (this.state.mode.isDragging) {
      const coords = this.state.canvas.container.toLocal(event.global);
      const point = Hexagon.coordToAxial(coords);

      if (
        this.state.mode.view === "select" &&
        this.state.mode.input.startPoint
      ) {
        this.destroySelectArea();

        const ctx = new Graphics({ eventMode: "none" });
        ctx
          .moveTo(
            this.state.mode.input.startPoint.x,
            this.state.mode.input.startPoint.y,
          )
          .lineTo(coords.x, this.state.mode.input.startPoint.y)
          .lineTo(coords.x, coords.y)
          .lineTo(this.state.mode.input.startPoint.x, coords.y)
          .lineTo(
            this.state.mode.input.startPoint.x,
            this.state.mode.input.startPoint.y,
          )
          .stroke({ width: 4, color: 0xffffff, pixelLine: true });
        this.state.canvas.container.addChild(ctx);
        this.state.activeSelectArea = ctx;

        for (const text of this.state.texts) {
          const minX = Math.min(this.state.mode.input.startPoint.x, coords.x);
          const maxX = Math.max(this.state.mode.input.startPoint.x, coords.x);
          const minY = Math.min(this.state.mode.input.startPoint.y, coords.y);
          const maxY = Math.max(this.state.mode.input.startPoint.y, coords.y);
          if (
            text.position.x >= minX &&
            text.position.x <= maxX &&
            text.position.y >= minY &&
            text.position.y <= maxY
          ) {
            this.state.selectedItems.set(text.uid, text);

            const padding = 10;
            const borderCtx = new Graphics({ eventMode: "none" });
            borderCtx
              .rect(
                -padding,
                -padding,
                text.width + padding * 2,
                text.height + padding * 2,
              )
              .stroke({ width: 2, color: "yellow", pixelLine: true });

            text.children.at(0)?.destroy();
            text.addChild(borderCtx);
          } else {
            text.children.at(0)?.destroy();
            this.state.selectedItems.delete(text.uid);
          }
        }
        return;
      } else {
        if (this.state.activeCell && point.isEqual(this.state.activeCell)) {
          return;
        }

        this.state.activeCell = point;
      }

      if (this.state.mode.view === "terrain") {
        if (this.state.mode.input.terrain === undefined) {
          return;
        }

        this.paintCellsInStroke(point, this.state.mode.input.strokeWidth, true);
      } else if (this.state.mode.view === "texture") {
        if (this.state.mode.input.textureId === undefined) {
          return;
        }

        this.paintCellsInStroke(
          point,
          this.state.mode.input.strokeWidth,
          false,
        );
      } else if (
        this.state.mode.view === "measure" &&
        this.state.mode.input.rulerType !== undefined &&
        this.state.mode.input.startPoint
      ) {
        this.paintMeasureShape(
          this.state.mode.input.startPoint,
          point,
          this.state.mode.input.rulerType,
        );
      }

      return;
    }
  };

  private handlePointerUp = (event: FederatedPointerEvent) => {
    event.preventDefault();
    event.stopPropagation();

    this.state.mode.isDragging = false;

    this.state.activeCell = null;

    this.destroyMeasureShape();
    this.destroySelectArea();
  };

  private paintCell(point: Axial, showTerrain = false) {
    const cell = this.state.level.getCell(point);
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

  private destroyMeasureShape() {
    if (!this.state.activeMeasureShape) {
      return;
    }

    this.state.canvas.container.removeChild(this.state.activeMeasureShape.line);
    this.state.activeMeasureShape.line.destroy();
    this.state.activeMeasureShape.cells.forEach((cell) => {
      this.state.canvas.container.removeChild(cell.hex);
      this.state.canvas.container.removeChild(cell.text);

      cell.hex.destroy();
      cell.text.destroy();
    });

    this.state.activeMeasureShape = null;
  }

  private destroySelectArea() {
    if (!this.state.activeSelectArea) {
      return;
    }

    this.state.canvas.container.removeChild(this.state.activeSelectArea);
    this.state.activeSelectArea.destroy();
    this.state.activeSelectArea = null;
  }

  private paintMeasureShape(start: Axial, end: Axial, shape: RulerType) {
    this.destroyMeasureShape();

    const ctx = new Graphics({ eventMode: "none" });
    Line.draw(
      ctx,
      start.toCartesian(Hexagon.xRadius, Hexagon.yRadius),
      end.toCartesian(Hexagon.xRadius, Hexagon.yRadius),
      { stroke: { color: 0xffffff, width: 4, pixelLine: true } },
    );
    this.state.canvas.container.addChild(ctx);

    const cells =
      shape === RulerType.Line
        ? this.getCellsInLine(start, end)
        : shape === RulerType.Cone
          ? this.getCellsInCone(start, end)
          : shape === RulerType.Circle
            ? this.getCellsInCircle(
                start,
                this.state.level.calcDistance(start, end, false) + 1,
              )
            : this.getCellsInSquare(start, end);
    const shapeCells: { hex: Graphics; text: BitmapText }[] = [];
    cells.forEach((cell, i) => {
      const hexCtx = new Graphics({ eventMode: "none" });
      Hexagon.draw(hexCtx, cell, {
        fill: { color: 0x00ffff, alpha: 0.5 },
      });
      this.state.canvas.container.addChild(hexCtx);

      const textSize = 128;
      const textPosition = cell.toCartesian(Hexagon.xRadius, Hexagon.yRadius);
      textPosition.x -= textSize / 4;
      textPosition.y -= textSize / 1.75;
      const textCtx = new BitmapText({
        eventMode: "none",
        text:
          shape === RulerType.Line
            ? String(i)
            : this.state.level.calcDistance(start, cell).toString(),
        style: { fill: 0xff9900, fontSize: textSize, fontFamily: "PirataOne" },
        position: textPosition,
      });
      this.state.canvas.container.addChild(textCtx);

      shapeCells.push({ hex: hexCtx, text: textCtx });
    });

    this.state.activeMeasureShape = { line: ctx, cells: shapeCells };
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

    return cells.filter((cell) => this.state.level.getCell(cell));
  }

  private paintCellsInStroke(
    center: Axial,
    strokeWidth: number,
    showTerrain = false,
  ) {
    const points = this.getCellsInCircle(center, strokeWidth);
    for (const p of points) {
      const cell = this.state.level.getCell(p);
      if (!cell) {
        continue;
      }

      if (this.state.mode.view === "terrain") {
        if (this.state.mode.input.terrain === undefined) {
          continue;
        }

        this.state.level.setCell(p, {
          ...cell.value,
          weight: this.state.mode.input.terrain,
        });
      } else if (this.state.mode.view === "texture") {
        if (this.state.mode.input.textureId === undefined) {
          continue;
        }

        let weight = cell.value.weight;
        if (this.state.mode.input.textureId === -1) {
          weight = 0;
        } else if (cell.value.weight === 0) {
          weight = 1;
        }
        this.state.level.setCell(p, {
          ...cell.value,
          textureId: this.state.mode.input.textureId,
          weight,
        });
      }

      this.paintCell(p, showTerrain);
    }
  }

  private getCellsInLine(start: Axial, end: Axial): Axial[] {
    const cells = [];
    const dist = this.state.level.calcDistance(start, end);

    if (dist === 0) {
      cells.push(start);
      return cells;
    }

    let startCube = start.toCube();
    let endCube = end.toCube();

    const epsilon =
      this.state.mode.view === "measure" && this.state.mode.input.altPath
        ? -1e-6
        : 1e-6;

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
        let neighborsAdded = 0;
        const neighbors =
          startCar.x <= endCar.x
            ? layer[j].getNeighbors()
            : layer[j].getNeighbors().toReversed();
        for (const neighbor of neighbors) {
          const distFromStart = this.state.level.calcDistance(
            start,
            neighbor,
            true,
          );
          const distFromCurrentPoint = this.state.level.calcDistance(
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
      }

      cells = cells.concat(
        layer
          .sort(
            (a, b) =>
              this.state.level.calcDistance(lineCells[i - 1], a, true) -
              this.state.level.calcDistance(lineCells[i - 1], b, true),
          )
          .slice(0, i),
      );
    }

    return cells.filter((cell) => this.state.level.getCell(cell));
  }

  private getCellsInSquare(start: Axial, end: Axial): Axial[] {
    const cells: Axial[] = [];
    const dist = this.state.level.calcDistance(start, end);

    if (dist === 0) {
      cells.push(start);
      return cells;
    }

    if (dist === 1) {
      cells.push(start);
      cells.push(end);

      for (const neighbor of end.getNeighbors()) {
        let neighborsAdded = 0;

        const distFromStart = this.state.level.calcDistance(start, neighbor);
        const distFromEnd = this.state.level.calcDistance(end, neighbor);

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

    return cells.filter((cell) => this.state.level.getCell(cell));
  }
}
