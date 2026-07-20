import Controller, {
  MouseButton,
  type GameMouseMoveEvent,
  type GameMousePressEvent,
  type GameMouseReleaseEvent,
  type GameMouseScrollEvent,
} from "$lib/controller";
import type Game from ".";
import * as GLM from "gl-matrix";
import highlightTexture from "$lib/assets/highlight.png";
import { Axial, Cartesian, Cube } from "$lib/point";
import Texture from "$lib/renderer/texture";
import PathfindingGrid from "$lib/pathfinding-grid";
import Hexagon from "$lib/hexagon";
import Camera from "$lib/renderer/camera";
import Renderer from "$lib/renderer";
import { batchByTexture } from "$lib/renderer/utils";
import Rectangle from "$lib/rectangle";
import {
  BACKGROUND_COLOR,
  BORDER_THICKNESS,
  DEFAULT_CELL_TEXTURE,
  DEFAULT_GRID_HEIGHT,
  DEFAULT_GRID_WIDTH,
  RED,
  WHITE,
  ZLEVEL_ABOVE,
  ZLEVEL_FLOATING,
} from "$lib/game/level-editor/consts";
import { buildCellsDrawBuffer, writeHexInstance } from "$lib/game/level-editor/draw";
import { getCellTextureUrl, type APILevelData } from "$lib/api";

export const DEFAULT_TOOL: LevelEditorTool = {
  type: "texturebrush",
  texture: null,
};
export const DEFAULT_VIEW_MODE: LevelEditorViewMode = "texture";

export type LevelEditorViewMode = "texture" | "weight";

export type BrushTextureTool = { type: "texturebrush"; texture: string | null };
export type BrushWeightTool = { type: "weightbrush"; weight: number };
export type BrushTool = BrushTextureTool | BrushWeightTool;

export type PaintBucketTextureTool = { type: "texturepaintbucket"; texture: string | null };
export type PaintBucketWeightTool = { type: "weightpaintbucket"; weight: number };
export type PaintBucketTool = PaintBucketTextureTool | PaintBucketWeightTool;

export type MeasureTool = { type: "measure"; start: Axial | null; shape: "line" | "cone" };

export type LevelEditorTool = BrushTool | MeasureTool | PaintBucketTool;

export default class LevelEditor implements Game {
  private renderer: Renderer | undefined;
  private windowWidth: number = 0;
  private windowHeight: number = 0;
  grid: PathfindingGrid<{ weight: number; texture: string }>;
  private camera: Camera | undefined;
  private controller: Controller | undefined;
  private input: { type: "none" } | { type: "dragging"; button: MouseButton } = {
    type: "none",
  };
  private cursorLocation: Axial | null = null;
  private isPaused = false;
  tool: LevelEditorTool = DEFAULT_TOOL;
  viewMode: LevelEditorViewMode = "texture";

  constructor(data?: APILevelData) {
    if (!data) {
      this.grid = PathfindingGrid.fromDimensions(DEFAULT_GRID_WIDTH, DEFAULT_GRID_HEIGHT, {
        weight: 0,
        texture: DEFAULT_CELL_TEXTURE,
      });
      return;
    }

    this.grid = PathfindingGrid.fromCells(
      data.grid.cells.map(({ r, q, weight, texture }) => ({
        point: new Axial(q, r),
        value: { texture: texture ?? DEFAULT_CELL_TEXTURE, weight },
      })),
    );
  }

  get paused(): boolean {
    return this.isPaused;
  }

  async start(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas, {
      resizeToWindow: true,
      backgroundColor: BACKGROUND_COLOR,
    });
    this.renderer.createElement("hexagon", Hexagon);
    this.renderer.createElement("rectangle", Rectangle);

    await Promise.all([
      this.renderer!.loadTexture(DEFAULT_CELL_TEXTURE, new Texture(1, 1), {
        mode: "nearest",
      }),
      this.renderer!.loadTexture("highlight", highlightTexture, {
        mode: "nearest",
        repeat: true,
      }),
    ]);

    const textures = new Set(
      this.grid.cells
        .filter(({ value }) => !!value.texture && value.texture !== DEFAULT_CELL_TEXTURE)
        .map(({ value }) => value.texture!),
    );
    await Promise.all(
      textures
        .values()
        .map((texture) => this.loadTexture(texture, getCellTextureUrl(texture).toString())),
    );

    this.controller = new Controller(canvas);

    this.windowWidth = canvas.width;
    this.windowHeight = canvas.height;
    this.camera = new Camera(canvas.width / canvas.height);
    canvas.addEventListener("resize", () => {
      if (this.camera) {
        this.windowWidth = canvas.width;
        this.windowHeight = canvas.height;
        this.camera.aspectRatio = canvas.width / canvas.height;
      }
    });

    const center = new Axial(DEFAULT_GRID_WIDTH / 3, DEFAULT_GRID_HEIGHT / 4).toCartesian();
    this.camera.translate(GLM.vec3.fromValues(-center.x, -center.y, 0));

    const isoPitch = Math.PI / 3;
    this.camera.rotateX(isoPitch);

    this.camera.zoom = 3;
  }

  update() {
    if (this.isPaused) {
      return;
    }

    for (const event of this.controller!.getMouseEvents()) {
      switch (event.type) {
        case "clear": {
          this.handleClear();
          break;
        }
        case "press": {
          this.handlePress(event);
          break;
        }
        case "release": {
          this.handleRelease(event);
          break;
        }
        case "move": {
          this.handleMove(event);
          break;
        }
        case "scroll": {
          this.handleScroll(event);
          break;
        }
      }
    }
  }

  draw() {
    if (!this.renderer) {
      return;
    }

    this.renderer.clear();
    this.drawCells();
    if (this.tool.type === "measure") {
      if (this.tool.shape === "line") {
        this.drawMeasureLine();
      } else {
        this.drawMeasureCone();
      }
    }
  }

  destroy() {
    this.renderer?.destroy();
  }

  async loadTexture(name: string, src: string) {
    const originalTexture = this.renderer!.activeTexture;
    await this.renderer!.loadTexture(name, src, {
      mode: "nearest",
      repeat: true,
    });

    if (originalTexture) {
      this.renderer!.useTexture(originalTexture);
    }
  }

  hasTexture(name: string) {
    return this.renderer!.hasTexture(name);
  }

  pause() {
    this.isPaused = true;
  }

  unpause() {
    this.isPaused = false;
  }

  private drawCells() {
    if (!this.renderer || !this.camera) {
      return;
    }

    const hexagon = this.renderer.getAndUseElement<Hexagon>("hexagon");
    hexagon.setCamera(this.camera);
    hexagon.enableBorder(BORDER_THICKNESS);

    const cells = this.grid.cells;
    const batches = batchByTexture(
      cells.map(({ value }) => ({
        texture: value.texture,
      })),
    );
    const buffer = buildCellsDrawBuffer(hexagon.floatsPerInstance, cells, batches, {
      highlightedPoint: this.cursorLocation ?? undefined,
      drawWeightOverlay: this.viewMode === "weight",
    });
    this.renderer.drawBatch(hexagon, buffer, batches);
  }

  private drawMeasureLine() {
    if (!this.renderer || !this.camera) {
      return;
    }

    if (this.tool.type !== "measure" || !this.tool.start || !this.cursorLocation) {
      return;
    }

    const start = this.tool.start.toCartesian();
    const end = this.cursorLocation.toCartesian();

    // highlight cells
    const startCube = start.toCube();
    const endCube = end.toCube();
    const distance = Cube.distance(startCube, endCube);

    const hexagon = this.renderer.getAndUseElement<Hexagon>("hexagon");
    hexagon.setCamera(this.camera);
    hexagon.enableBorder(BORDER_THICKNESS);

    const cellBuffer = new Float32Array((distance + 1) * hexagon.floatsPerInstance);
    for (let i = 0; i <= distance; i++) {
      const point = Cube.round(startCube.lerp(endCube, (1 / distance) * i));
      const { x, y } = point.toCartesian();
      const model = GLM.mat4.create();
      GLM.mat4.translate(model, model, GLM.vec3.fromValues(x, y, ZLEVEL_ABOVE));

      const color = WHITE;
      const borderColor = WHITE;
      const offset = i * hexagon.floatsPerInstance;
      writeHexInstance(cellBuffer, offset, model, color, borderColor);
    }
    this.renderer.drawBatch(hexagon, cellBuffer, [
      { texture: "highlight", offset: 0, count: distance + 1 },
    ]);

    // draw line
    const rectangle = this.renderer.getAndUseElement<Rectangle>("rectangle");
    rectangle.setCamera(this.camera);

    const lineBuffer = new Float32Array(rectangle.floatsPerInstance);
    const model = this.createLineTransform(start, end, 0.05);
    lineBuffer.set(model);
    const color = RED;
    lineBuffer.set(color, model.length);

    this.renderer.drawBatch(rectangle, lineBuffer, [{ texture: "plain", offset: 0, count: 1 }]);
  }

  private drawMeasureCone() {
    if (!this.renderer || !this.camera) {
      return;
    }

    if (this.tool.type !== "measure" || !this.tool.start || !this.cursorLocation) {
      return;
    }

    const start = this.tool.start.toCartesian();
    const end = this.cursorLocation.toCartesian();

    // highlight cells
    const startCube = start.toCube();
    const endCube = end.toCube();
    const distance = Cube.distance(startCube, endCube);

    if (distance < 1) {
      return;
    }

    const hexagon = this.renderer.getAndUseElement<Hexagon>("hexagon");
    hexagon.setCamera(this.camera);
    hexagon.enableBorder(BORDER_THICKNESS);

    // draw line
    const rectangle = this.renderer.getAndUseElement<Rectangle>("rectangle");
    rectangle.setCamera(this.camera);
    const lineBuffer = new Float32Array(rectangle.floatsPerInstance);
    const model = this.createLineTransform(start, end, 0.05);
    lineBuffer.set(model);
    const color = RED;
    lineBuffer.set(color, model.length);

    this.renderer.drawBatch(rectangle, lineBuffer, [{ texture: "plain", offset: 0, count: 1 }]);

    // Walk every cell within distance of the start
    // Keep the ones whose angle from the line is within 30 degrees.
    const dirX = end.x - start.x;
    const dirY = end.y - start.y;
    const dirLen = Math.hypot(dirX, dirY);
    const halfAngleCos = Math.cos(Math.PI / 6);
    const startAxial = this.tool.start;

    const cells: Axial[] = [];
    for (let dq = -distance; dq <= distance; dq++) {
      const rMin = Math.max(-distance, -dq - distance);
      const rMax = Math.min(distance, -dq + distance);
      for (let dr = rMin; dr <= rMax; dr++) {
        if (dq === 0 && dr === 0) {
          continue;
        }

        const point = new Axial(startAxial.q + dq, startAxial.r + dr);
        const { x, y } = point.toCartesian();
        const px = x - start.x;
        const py = y - start.y;
        const cosAngle = (px * dirX + py * dirY) / (Math.hypot(px, py) * dirLen);

        if (cosAngle >= halfAngleCos - 1e-9 && this.grid.get(point)) {
          cells.push(point);
        }
      }
    }

    const cellBuffer = new Float32Array(cells.length * hexagon.floatsPerInstance);
    const writeCell = (point: Axial, offset: number) => {
      const { x, y } = point.toCartesian();
      const model = GLM.mat4.create();
      GLM.mat4.translate(model, model, GLM.vec3.fromValues(x, y, ZLEVEL_ABOVE));

      const color = WHITE;
      const borderColor = WHITE;
      writeHexInstance(cellBuffer, offset, model, color, borderColor);
    };
    cells.forEach((cell, index) => writeCell(cell, index * hexagon.floatsPerInstance));
    this.renderer.drawBatch(hexagon, cellBuffer, [
      { texture: "highlight", offset: 0, count: cells.length },
    ]);
  }

  private canvasCoordToCartesian(x: number, y: number): Cartesian {
    if (!this.camera) {
      return new Cartesian(0, 0);
    }

    // normalized device coordinates, all values in [-1, 1]
    const ndcX = (x / this.windowWidth) * 2 - 1;
    const ndcY = 1 - (y / this.windowHeight) * 2;

    // get the inverse of the camera transform
    const view = GLM.mat4.create();
    GLM.mat4.multiply(view, this.camera.projection, this.camera.view);
    const inverseView = GLM.mat4.create();
    GLM.mat4.invert(inverseView, view);

    // cast a ray
    const rayStartNDC = GLM.vec4.fromValues(ndcX, ndcY, -1.0, 1.0);
    const rayStart = GLM.vec4.create();
    GLM.vec4.transformMat4(rayStart, rayStartNDC, inverseView);

    // direction is just the camera's forward vector
    const rayDirection = GLM.vec3.fromValues(
      -this.camera.view[2],
      -this.camera.view[6],
      -this.camera.view[10],
    );
    GLM.vec3.normalize(rayDirection, rayDirection);

    // get ray z intersect
    const t = (0 - rayStart[2]) / rayDirection[2];
    const worldX = rayStart[0] + t * rayDirection[0];
    const worldY = rayStart[1] + t * rayDirection[1];

    return new Cartesian(worldX, worldY);
  }

  private canvasCoordToAxial(x: number, y: number): Axial {
    return this.canvasCoordToCartesian(x, y).toAxial();
  }

  // paint cell by canvas coordinate
  private paintCellWeight(x: number, y: number, weight: number) {
    const axial = this.canvasCoordToAxial(x, y);
    this.paintPointWeight(axial, weight);
  }

  // paint cell by axial coordinate
  private paintPointWeight(point: Axial, weight: number) {
    const original = this.grid.get(point);
    if (!original) {
      return;
    }

    this.grid.set(point, { ...original.value, weight });
  }

  // paint cell by canvas coordinate
  private paintCellTexture(x: number, y: number, texture: string | null) {
    const axial = this.canvasCoordToAxial(x, y);
    this.paintPointTexture(axial, texture);
  }

  // paint cell by axial coordinate
  private paintPointTexture(point: Axial, texture: string | null) {
    const original = this.grid.get(point);
    if (!original) {
      return;
    }

    this.grid.set(point, {
      ...original.value,
      texture: texture ?? DEFAULT_CELL_TEXTURE,
    });
  }

  /** create a transform to convert a rectangle to a line */
  private createLineTransform(from: Cartesian, to: Cartesian, width: number): GLM.mat4 {
    const difference = to.subtract(from);
    const halfDifference = new Cartesian(0.5 * difference.x, 0.5 * difference.y);
    const midpoint = from.add(halfDifference);
    const length = Math.sqrt(difference.x * difference.x + difference.y * difference.y);
    const theta = Math.atan(difference.y / difference.x);

    const transform = GLM.mat4.create();
    GLM.mat4.translate(
      transform,
      transform,
      GLM.vec3.fromValues(midpoint.x, midpoint.y, ZLEVEL_FLOATING),
    );
    GLM.mat4.rotate(transform, transform, theta, GLM.vec3.fromValues(0, 0, 1));
    GLM.mat4.scale(transform, transform, GLM.vec3.fromValues(length, width, 1));

    return transform;
  }

  private handleClear() {
    this.cursorLocation = null;
    this.input = { type: "none" };

    if (this.tool.type === "measure") {
      this.tool.start = null;
    }
  }

  private handlePress(event: GameMousePressEvent) {
    this.input = { type: "dragging", button: event.button };

    if (this.tool.type === "measure" && this.input.button === MouseButton.Left) {
      this.tool.start = this.canvasCoordToAxial(event.x, event.y);
    }
  }

  private handleRelease(event: GameMouseReleaseEvent) {
    if (this.input.type === "dragging") {
      if (this.input.button === MouseButton.Left) {
        if (this.tool.type === "texturebrush") {
          this.paintCellTexture(event.x, event.y, this.tool.texture);
        }

        if (this.tool.type === "weightbrush") {
          this.paintCellWeight(event.x, event.y, this.tool.weight);
        }

        if (
          (this.tool.type === "texturepaintbucket" || this.tool.type === "weightpaintbucket") &&
          this.cursorLocation
        ) {
          // get all accessible cells
          const start = this.grid.get(this.cursorLocation);
          if (start) {
            const points = this.grid.getAccessiblePoints(
              this.cursorLocation,
              this.tool.type === "texturepaintbucket"
                ? (point) => {
                    const cell = this.grid.get(point);
                    if (!cell) {
                      return false;
                    }

                    return start.value.texture === cell.value.texture;
                  }
                : (point) => {
                    const cell = this.grid.get(point);
                    if (!cell) {
                      return false;
                    }

                    return start.value.weight === cell.value.weight;
                  },
            );

            for (const point of points) {
              if (this.tool.type === "texturepaintbucket") {
                this.paintPointTexture(point, this.tool.texture);
              } else {
                this.paintPointWeight(point, this.tool.weight);
              }
            }
          }
        }
      }

      if (this.tool.type === "measure") {
        this.tool.start = null;
      }

      this.input = { type: "none" };
    }
  }

  private handleMove(event: GameMouseMoveEvent) {
    this.cursorLocation = this.canvasCoordToAxial(event.x, event.y);

    if (this.input.type === "dragging" && this.input.button === MouseButton.Middle) {
      const end = this.canvasCoordToCartesian(event.x, event.y);
      const start = this.canvasCoordToCartesian(event.x - event.deltaX, event.y - event.deltaY);
      const delta = start.subtract(end);

      this.camera?.translate(GLM.vec3.fromValues(-delta.x, delta.y, 0));
    }

    if (
      this.input.type === "dragging" &&
      this.input.button === MouseButton.Left &&
      this.tool.type === "texturebrush"
    ) {
      this.paintCellTexture(event.x, event.y, this.tool.texture);
    }

    if (
      this.input.type === "dragging" &&
      this.input.button === MouseButton.Left &&
      this.tool.type === "weightbrush"
    ) {
      this.paintCellWeight(event.x, event.y, this.tool.weight);
    }
  }

  private handleScroll(event: GameMouseScrollEvent) {
    this.camera!.zoom = Math.max(1, this.camera!.zoom + event.delta / 25);
  }
}
