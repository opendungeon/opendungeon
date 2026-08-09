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
import Rectangle from "$lib/rectangle";
import {
  AQUA,
  BACKGROUND_COLOR,
  BORDER_THICKNESS,
  CLEAR,
  DEFAULT_BORDER_COLOR,
  DEFAULT_CELL_TEXTURE,
  DEFAULT_GRID_HEIGHT,
  DEFAULT_GRID_WIDTH,
  RED,
  WHITE,
  YELLOW,
  ZLEVEL_ABOVE,
  ZLEVEL_FLOATING,
} from "$lib/game/level-editor/consts";
import {
  getPointsInArea,
  getPointsInCone,
  getPointsInLine,
  writeHexInstance,
} from "$lib/game/level-editor/utils";
import { getMediaUrl, type APICellTexture, type APILevelData } from "$lib/api";

export const DEFAULT_TOOL: LevelEditorTool = {
  type: "texturebrush",
  texture: null,
  radius: 1,
};
export const DEFAULT_VIEW_MODE: LevelEditorViewMode = "texture";

export type LevelEditorViewMode = "texture" | "weight";

export type BrushTextureTool = { type: "texturebrush"; texture: string | null; radius: number };
export type BrushWeightTool = { type: "weightbrush"; weight: number; radius: number };
export type BrushTool = BrushTextureTool | BrushWeightTool;

export type PaintBucketTextureTool = { type: "texturepaintbucket"; texture: string | null };
export type PaintBucketWeightTool = { type: "weightpaintbucket"; weight: number };
export type PaintBucketTool = PaintBucketTextureTool | PaintBucketWeightTool;

export type MeasureTool = {
  type: "measure";
  start: Axial | null;
  shape: "line" | "cone" | "area";
};

export type LevelEditorTool = BrushTool | MeasureTool | PaintBucketTool;

export default class LevelEditor implements Game {
  private renderer: Renderer | undefined;
  private windowWidth: number = 0;
  private windowHeight: number = 0;
  private camera: Camera | undefined;
  private controller: Controller | undefined;
  private input: { type: "none" } | { type: "dragging"; button: MouseButton } = {
    type: "none",
  };
  private cursorPoint: Axial | undefined;
  private isPaused = false;
  private measureTextElement: HTMLDivElement | undefined;
  private unit: "metric" | "imperial" = "imperial";
  private hexagonElementId: number | undefined;
  private rectangleElementId: number | undefined;
  private preloadTextureMedia: [string, string][] | undefined;

  grid: PathfindingGrid<{ weight: number; texture: string }>;
  _tool: LevelEditorTool = DEFAULT_TOOL;
  viewMode: LevelEditorViewMode = "texture";

  constructor(data?: APILevelData, cellTextures?: APICellTexture[]) {
    // create blank canvas
    this.grid = PathfindingGrid.fromDimensions(DEFAULT_GRID_WIDTH, DEFAULT_GRID_HEIGHT, {
      weight: 0,
      texture: DEFAULT_CELL_TEXTURE,
    });

    // load level data onto the blank canvas
    if (data && data.grid.cells.length >= 1) {
      for (const cell of data.grid.cells) {
        const point = new Axial(cell.q, cell.r);
        const texture = data.textures[cell.texture];
        this.grid.set(point, { weight: cell.weight, texture });
      }

      if (data.textures.length >= 1) {
        if (!cellTextures) {
          throw new Error("Missing required cell texture data.");
        }

        const cellTextureMediaLookup = Object.fromEntries(
          cellTextures.map(({ key, mediaId }) => [key, mediaId]),
        );
        this.preloadTextureMedia = data.textures
          .filter((texture) => texture !== DEFAULT_CELL_TEXTURE)
          .map((texture) => [texture, cellTextureMediaLookup[texture]]);
      }
    }
  }

  get paused(): boolean {
    return this.isPaused;
  }

  get tool(): LevelEditorTool {
    return this._tool;
  }

  set tool(tool: LevelEditorTool) {
    if (this.measureTextElement) {
      if (tool.type == "measure") {
        this.measureTextElement.hidden = false;
      } else {
        this.measureTextElement.hidden = true;
      }
    }

    this._tool = tool;
  }

  async start(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas, {
      resizeToWindow: true,
      backgroundColor: BACKGROUND_COLOR,
    });
    this.hexagonElementId = this.renderer.createElement(Hexagon);
    this.rectangleElementId = this.renderer.createElement(Rectangle);

    await Promise.all([
      this.renderer!.loadTexture(DEFAULT_CELL_TEXTURE, new Texture(1, 1), {
        mode: "nearest",
      }),
      this.renderer!.loadTexture("highlight", highlightTexture, {
        mode: "nearest",
        repeat: true,
      }),
    ]);

    if (this.preloadTextureMedia) {
      await Promise.all(
        this.preloadTextureMedia.map(([texture, mediaId]) =>
          this.loadTexture(texture, getMediaUrl(mediaId).toString()),
        ),
      );
    }

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

    const gameWindow = document.getElementById("game-window");
    if (!gameWindow) {
      throw new Error("missing game window");
    }

    this.measureTextElement = document.createElement("div");
    this.measureTextElement.style.pointerEvents = "none";
    this.measureTextElement.style.position = "absolute";
    this.measureTextElement.style.zIndex = "5";
    this.measureTextElement.style.color = "red";
    this.measureTextElement.style.fontSize = "24px";
    this.measureTextElement.style.fontWeight = "600";
    this.measureTextElement.style.backgroundColor = "#000000e3";
    this.measureTextElement.hidden = true;
    gameWindow.appendChild(this.measureTextElement);
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
    if (this._tool.type === "measure") {
      if (this._tool.start && this.cursorPoint) {
        const { canvasX, canvasY } = this.cartesianToCanvasCoord(this.cursorPoint.toCartesian());
        this.measureTextElement!.style.left = `${canvasX}px`;
        this.measureTextElement!.style.top = `${canvasY}px`;

        const distance = Cube.distance(this._tool.start.toCube(), this.cursorPoint.toCube());
        this.measureTextElement!.innerHTML =
          this.unit === "metric" ? `${distance * 1.5} meters` : `${distance * 5} feet`;
      } else {
        this.measureTextElement!.innerHTML = "";
      }

      this.drawMeasure();
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

    const hexagon = this.renderer.getAndUseElement<Hexagon>(this.hexagonElementId!);
    hexagon.enableBorder(BORDER_THICKNESS);
    hexagon.setCamera(this.camera);

    const cells = this.grid.cells;
    const cellsByTexture: Record<string, Axial[]> = {};
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const texture = cell.value.texture;

      if (cellsByTexture[texture] === undefined) {
        cellsByTexture[texture] = [cell.point];
        continue;
      }

      cellsByTexture[texture].push(cell.point);
    }

    for (const [texture, points] of Object.entries(cellsByTexture)) {
      this.renderer.useTexture(texture);

      const buffer = hexagon.allocate(points.length);
      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const { x, y } = point.toCartesian();
        const offset = i * hexagon.instanceSize;
        const transform = GLM.mat4.create();
        GLM.mat4.translate(transform, transform, GLM.vec3.fromValues(x, y, 0));
        const color = texture === DEFAULT_CELL_TEXTURE ? CLEAR : WHITE;
        const borderColor = point.isEqual(this.cursorPoint) ? WHITE : DEFAULT_BORDER_COLOR;
        writeHexInstance(buffer, offset, transform, color, borderColor);
      }

      hexagon.draw();
    }

    if (this.viewMode === "weight") {
      this.renderer.useTexture("highlight");

      const buffer = hexagon.allocate(cells.length);
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        const point = cell.point;
        const { x, y } = point.toCartesian();
        const offset = i * hexagon.instanceSize;
        const transform = GLM.mat4.create();
        GLM.mat4.translate(transform, transform, GLM.vec3.fromValues(x, y, ZLEVEL_ABOVE));
        const color = cell.value.weight === 2 ? YELLOW : cell.value.weight === 1 ? AQUA : RED;
        const borderColor = point.isEqual(this.cursorPoint) ? WHITE : color;
        writeHexInstance(buffer, offset, transform, color, borderColor);
      }

      hexagon.draw();
    }
  }

  private drawMeasure() {
    if (!this.renderer || !this.camera) {
      return;
    }

    if (this._tool.type !== "measure" || !this._tool.start || !this.cursorPoint) {
      return;
    }

    const start = this._tool.start.toCartesian();
    const end = this.cursorPoint.toCartesian();

    // highlight cells
    const hexagon = this.renderer.getAndUseElement<Hexagon>(this.hexagonElementId!);
    hexagon.setCamera(this.camera);
    hexagon.enableBorder(BORDER_THICKNESS);
    this.renderer.useTexture("highlight");

    let points = [];
    switch (this._tool.shape) {
      case "line":
        points = getPointsInLine(this._tool.start, this.cursorPoint);
        break;
      case "cone":
        points = getPointsInCone(this._tool.start, this.cursorPoint);
        break;
      case "area":
        points = getPointsInArea(this._tool.start, this.cursorPoint);
        break;
    }
    points = points.filter((point) => this.grid.has(point));

    const cellBuffer = hexagon.allocate(points.length);
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const { x, y } = point.toCartesian();
      const transform = GLM.mat4.create();
      GLM.mat4.translate(transform, transform, GLM.vec3.fromValues(x, y, ZLEVEL_ABOVE));

      const color = WHITE;
      const borderColor = WHITE;
      const offset = i * hexagon.instanceSize;
      writeHexInstance(cellBuffer, offset, transform, color, borderColor);
    }
    hexagon.draw();

    // draw line
    const rectangle = this.renderer.getAndUseElement<Rectangle>(this.rectangleElementId!);
    rectangle.setCamera(this.camera);
    this.renderer.useTexture("plain");

    const lineBuffer = rectangle.allocate(1);
    const model = this.createLineTransform(start, end, 0.05);
    lineBuffer.set(model);
    const color = RED;
    lineBuffer.set(color, model.length);

    rectangle.draw();
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

  private cartesianToCanvasCoord(point: Cartesian): { canvasX: number; canvasY: number } {
    if (!this.camera) {
      return { canvasX: 0, canvasY: 0 };
    }

    const viewProjection = GLM.mat4.create();
    GLM.mat4.mul(viewProjection, this.camera.projection, this.camera.view);

    const world = GLM.vec4.fromValues(point.x, point.y, 0, 1);
    const clip = GLM.mat4.create();
    GLM.vec4.transformMat4(clip, world, viewProjection);

    const ndcX = clip[0] / clip[3];
    const ndcY = clip[1] / clip[3];

    const canvasX = (ndcX + 1) * 0.5 * this.windowWidth;
    const canvasY = (1 - ndcY) * 0.5 * this.windowHeight;

    return { canvasX, canvasY };
  }

  // paint cell by canvas coordinate
  private paintCellWeight(x: number, y: number, weight: number, radius: number) {
    const axial = this.canvasCoordToAxial(x, y);
    this.paintPointWeight(axial, weight, radius);
  }

  // paint cell by axial coordinate
  private paintPointWeight(point: Axial, weight: number, radius: number) {
    const points = this.grid.getNearbyPoints(point, radius);

    for (const point of points) {
      const original = this.grid.get(point);
      if (!original) {
        continue;
      }

      this.grid.set(point, {
        ...original.value,
        weight: weight,
      });
    }
  }

  // paint cell by canvas coordinate
  private paintCellTexture(x: number, y: number, texture: string | null, radius: number) {
    const axial = this.canvasCoordToAxial(x, y);
    this.paintPointTexture(axial, texture, radius);
  }

  // paint cell by axial coordinate
  private paintPointTexture(point: Axial, texture: string | null, radius: number) {
    const points = this.grid.getNearbyPoints(point, radius);

    for (const point of points) {
      const original = this.grid.get(point);
      if (!original) {
        continue;
      }

      this.grid.set(point, {
        ...original.value,
        texture: texture ?? DEFAULT_CELL_TEXTURE,
      });
    }
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
    this.cursorPoint = undefined;
    this.input = { type: "none" };

    if (this._tool.type === "measure") {
      this._tool.start = null;
    }
  }

  private handlePress(event: GameMousePressEvent) {
    this.input = { type: "dragging", button: event.button };

    if (this._tool.type === "measure" && this.input.button === MouseButton.Left) {
      this._tool.start = this.canvasCoordToAxial(event.x, event.y);
    }
  }

  private handleRelease(event: GameMouseReleaseEvent) {
    if (this.input.type === "dragging") {
      if (this.input.button === MouseButton.Left) {
        if (this._tool.type === "texturebrush") {
          this.paintCellTexture(event.x, event.y, this._tool.texture, this._tool.radius);
        }

        if (this._tool.type === "weightbrush") {
          this.paintCellWeight(event.x, event.y, this._tool.weight, this._tool.radius);
        }

        if (
          (this._tool.type === "texturepaintbucket" || this._tool.type === "weightpaintbucket") &&
          this.cursorPoint
        ) {
          // get all accessible cells
          const start = this.grid.get(this.cursorPoint);
          if (start) {
            const points = this.grid.getAccessiblePoints(
              this.cursorPoint,
              this._tool.type === "texturepaintbucket"
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
              if (this._tool.type === "texturepaintbucket") {
                this.paintPointTexture(point, this._tool.texture, 1);
              } else {
                this.paintPointWeight(point, this._tool.weight, 1);
              }
            }
          }
        }
      }

      if (this._tool.type === "measure") {
        this._tool.start = null;
      }

      this.input = { type: "none" };
    }
  }

  private handleMove(event: GameMouseMoveEvent) {
    this.cursorPoint = this.canvasCoordToAxial(event.x, event.y);

    if (this.input.type === "dragging" && this.input.button === MouseButton.Middle) {
      const end = this.canvasCoordToCartesian(event.x, event.y);
      const start = this.canvasCoordToCartesian(event.x - event.deltaX, event.y - event.deltaY);
      const delta = start.subtract(end);

      this.camera?.translate(GLM.vec3.fromValues(-delta.x, delta.y, 0));
    }

    if (
      this.input.type === "dragging" &&
      this.input.button === MouseButton.Left &&
      this._tool.type === "texturebrush"
    ) {
      this.paintCellTexture(event.x, event.y, this._tool.texture, this._tool.radius);
    }

    if (
      this.input.type === "dragging" &&
      this.input.button === MouseButton.Left &&
      this._tool.type === "weightbrush"
    ) {
      this.paintCellWeight(event.x, event.y, this._tool.weight, this._tool.radius);
    }
  }

  private handleScroll(event: GameMouseScrollEvent) {
    this.camera!.zoom = Math.max(1, this.camera!.zoom + event.delta / 25);
  }
}
