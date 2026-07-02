import Controller, { MouseButton } from "./controller";
import type Game from "./game";
import Rectangle from "./rectangle";
import Renderer from "./renderer";
import * as GLM from "gl-matrix";
import highlightTexture from "../assets/highlight.png";
import { Axial, Cartesian, Cube } from "./point";
import Texture from "./texture";
import PathfindingGrid from "./pathfinding-grid";
import Hexagon from "./hexagon";
import Camera from "./camera";

const DEFAULT_GRID_WIDTH = 128;
const DEFAULT_GRID_HEIGHT = 128;

const BACKGROUND_COLOR = new Float32Array([0.06, 0.06, 0.06, 1.0]);

const BORDER_THICKNESS = 0.02;
const DEFAULT_BORDER_COLOR = new Float32Array([0.0, 0.0, 0.0, 0.3]);

const RED = new Float32Array([1, 0, 0, 1]);
const YELLOW = new Float32Array([1, 1, 0, 1]);
const AQUA = new Float32Array([0, 1, 1, 1]);
const WHITE = new Float32Array([1, 1, 1, 1]);
const CLEAR = new Float32Array([0, 0, 0, 0]);

export type LevelEditorViewMode = "texture" | "weight";

export type BrushTool =
  | { type: "weightbrush"; weight: number }
  | { type: "texturebrush"; texture: string | null };

export type PaintBucketTool =
  | { type: "weightpaintbucket"; weight: number }
  | { type: "texturepaintbucket"; texture: string | null };

export type LevelEditorTool =
  | BrushTool
  | { type: "measure"; start: Axial | null }
  | PaintBucketTool;

export const DEFAULT_TOOL: LevelEditorTool = {
  type: "texturebrush",
  texture: null,
};

enum ZLevel {
  Beneath = -0.001,
  Default = 0.0,
  Above = 0.001,
  Floating = 0.002,
}

export default class LevelEditor implements Game {
  private renderer: Renderer | undefined;
  private windowWidth: number = 0;
  private windowHeight: number = 0;
  private grid: PathfindingGrid<{ weight: number; texture: string | null }> =
    new PathfindingGrid(DEFAULT_GRID_WIDTH, DEFAULT_GRID_HEIGHT, {
      weight: 0,
      texture: null,
    });
  private camera: Camera | undefined;
  private controller: Controller | undefined;
  private input: { type: "none" } | { type: "dragging"; button: MouseButton } =
    {
      type: "none",
    };
  private cursorLocation: Axial | null = null;
  private isPaused = false;
  tool: LevelEditorTool = DEFAULT_TOOL;
  viewMode: LevelEditorViewMode = "texture";

  get paused(): boolean {
    return this.isPaused;
  }

  async start(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas, {
      resizeToWindow: true,
      backgroundColor: BACKGROUND_COLOR,
    });
    this.renderer.createElement("rectangle", Rectangle);
    this.renderer.createElement("hexagon", Hexagon);

    await Promise.all([
      this.renderer!.loadTexture("plain", new Texture(1, 1), {
        mode: "nearest",
      }),
      this.renderer!.loadTexture("highlight", highlightTexture, {
        mode: "nearest",
        repeat: true,
      }),
    ]);

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

    const center = new Axial(
      DEFAULT_GRID_WIDTH / 3,
      DEFAULT_GRID_HEIGHT / 4,
    ).toCartesian();
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
          this.cursorLocation = null;
          this.input = { type: "none" };

          if (this.tool.type === "measure") {
            this.tool.start = null;
          }
          break;
        }
        case "press": {
          this.input = { type: "dragging", button: event.button };

          if (
            this.tool.type === "measure" &&
            this.input.button === MouseButton.Left
          ) {
            this.tool.start = this.canvasCoordToAxial(event.x, event.y);
          }
          break;
        }
        case "release": {
          if (this.input.type === "dragging") {
            if (this.input.button === MouseButton.Left) {
              if (this.tool.type === "texturebrush") {
                this.paintCellTexture(event.x, event.y, this.tool.texture);
              }

              if (this.tool.type === "weightbrush") {
                this.paintCellWeight(event.x, event.y, this.tool.weight);
              }

              if (
                (this.tool.type === "texturepaintbucket" ||
                  this.tool.type === "weightpaintbucket") &&
                this.cursorLocation
              ) {
                // get all accessible cells
                const start = this.grid.getCell(this.cursorLocation);
                if (start) {
                  const points = this.grid.getAccessiblePoints(
                    this.cursorLocation,
                    this.tool.type === "texturepaintbucket"
                      ? (point) => {
                          const cell = this.grid.getCell(point);
                          if (!cell) {
                            return false;
                          }

                          return start.value.texture === cell.value.texture;
                        }
                      : (point) => {
                          const cell = this.grid.getCell(point);
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
          break;
        }
        case "move": {
          // update cursor location
          this.cursorLocation = this.canvasCoordToAxial(event.x, event.y);

          if (
            this.input.type === "dragging" &&
            this.input.button === MouseButton.Middle
          ) {
            const end = this.canvasCoordToCartesian(event.x, event.y);
            const start = this.canvasCoordToCartesian(
              event.x - event.deltaX,
              event.y - event.deltaY,
            );
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
          break;
        }
        case "scroll": {
          this.camera!.zoom = Math.max(1, this.camera!.zoom + event.delta / 25);
          break;
        }
      }
    }
  }

  draw() {
    this.renderer!.clear();
    this.drawCells();
    this.drawMeasureLine();
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

    const hexagon = this.renderer.getAndUseElement("hexagon");
    hexagon.setUniformMatrix4fv("u_view", this.camera.view);
    hexagon.setUniformMatrix4fv("u_projection", this.camera.projection);
    hexagon.setUniformBool("u_enable_border", true);
    hexagon.setUniform1f("u_border_thickness", BORDER_THICKNESS);
    hexagon.setUniform4fv("u_border_color", DEFAULT_BORDER_COLOR);

    for (const cell of this.grid.cells) {
      const { x, y } = cell.point.toCartesian();
      const model = GLM.mat4.create();
      GLM.mat4.translate(
        model,
        model,
        GLM.vec3.fromValues(x, y, ZLevel.Default),
      );
      hexagon.setUniformMatrix4fv("u_model", model);

      if (cell.value.texture) {
        this.renderer.useTexture(cell.value.texture);
        hexagon.setUniform4fv("u_color", WHITE);
      } else {
        this.renderer.useTexture("plain");
        hexagon.setUniform4fv("u_color", CLEAR);
      }

      const isHoveringCell = this.cursorLocation?.isEqual(cell.point) ?? false;
      if (isHoveringCell) {
        hexagon.setUniform4fv("u_border_color", WHITE);
      }

      hexagon.draw();

      if (isHoveringCell) {
        hexagon.setUniform4fv("u_border_color", DEFAULT_BORDER_COLOR);
      }
    }

    if (this.viewMode === "weight") {
      this.renderer.useTexture("highlight");
      hexagon.setUniformBool("u_enable_border", true);
      hexagon.setUniform1f("u_border_thickness", BORDER_THICKNESS);

      for (const cell of this.grid.cells) {
        const { x, y } = cell.point.toCartesian();
        const model = GLM.mat4.create();
        GLM.mat4.translate(
          model,
          model,
          GLM.vec3.fromValues(x, y, ZLevel.Above),
        );
        hexagon.setUniformMatrix4fv("u_model", model);

        const color =
          cell.value.weight === 2
            ? YELLOW
            : cell.value.weight === 1
              ? AQUA
              : RED;
        hexagon.setUniform4fv("u_color", color);

        const isHoveringCell =
          this.cursorLocation?.isEqual(cell.point) ?? false;
        const borderColor = isHoveringCell ? WHITE : color;
        hexagon.setUniform4fv("u_border_color", borderColor);

        hexagon.draw();
      }
    }
  }

  private drawMeasureLine() {
    if (!this.renderer || !this.camera) {
      return;
    }

    if (
      this.tool.type !== "measure" ||
      !this.tool.start ||
      !this.cursorLocation
    ) {
      return;
    }

    const start = this.tool.start.toCartesian();
    const end = this.cursorLocation.toCartesian();

    // highlight cells
    const startCube = start.toCube();
    const endCube = end.toCube();
    const distance = Cube.distance(startCube, endCube);
    const highlight = this.renderer.getAndUseElement("hexagon");
    highlight.setUniformMatrix4fv("u_view", this.camera.view);
    highlight.setUniformMatrix4fv("u_projection", this.camera.projection);
    highlight.setUniform4fv("u_color", WHITE);
    highlight.setUniformBool("u_enable_border", true);
    highlight.setUniform1f("u_border_thickness", BORDER_THICKNESS);
    highlight.setUniform4fv("u_border_color", WHITE);
    this.renderer.useTexture("highlight");
    for (let i = 0; i <= distance; i++) {
      const point = Cube.round(startCube.lerp(endCube, (1 / distance) * i));
      const { x, y } = point.toCartesian();
      const model = GLM.mat4.create();
      GLM.mat4.translate(model, model, GLM.vec3.fromValues(x, y, ZLevel.Above));
      highlight.setUniformMatrix4fv("u_model", model);
      highlight.draw();
    }

    // draw line
    const rectangle = this.renderer.getAndUseElement("rectangle");
    this.renderer.useTexture("plain");

    const model = this.createLineTransform(start, end, 0.05);
    rectangle.setUniformMatrix4fv("u_model", model);
    rectangle.setUniformMatrix4fv("u_view", this.camera.view);
    rectangle.setUniformMatrix4fv("u_projection", this.camera.projection);
    rectangle.setUniform4fv("u_color", RED);

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

  // paint cell by canvas coordinate
  private paintCellWeight(x: number, y: number, weight: number) {
    const axial = this.canvasCoordToAxial(x, y);

    const original = this.grid.getCell(axial);
    if (!original) {
      return;
    }

    this.grid.setCell(axial, { ...original.value, weight });
  }

  // paint cell by axial coordinate
  private paintPointWeight(point: Axial, weight: number) {
    const original = this.grid.getCell(point);
    if (!original) {
      return;
    }

    this.grid.setCell(point, { ...original.value, weight });
  }

  // paint cell by canvas coordinate
  private paintCellTexture(x: number, y: number, texture: string | null) {
    const axial = this.canvasCoordToAxial(x, y);

    const original = this.grid.getCell(axial);
    if (!original) {
      return;
    }

    this.grid.setCell(axial, {
      ...original.value,
      texture,
    });
  }

  // paint cell by axial coordinate
  private paintPointTexture(point: Axial, texture: string | null) {
    const original = this.grid.getCell(point);
    if (!original) {
      return;
    }

    this.grid.setCell(point, {
      ...original.value,
      texture,
    });
  }

  /** create a transform to convert a rectangle to a line */
  private createLineTransform(
    from: Cartesian,
    to: Cartesian,
    width: number,
  ): GLM.mat4 {
    const difference = to.subtract(from);
    const halfDifference = new Cartesian(
      0.5 * difference.x,
      0.5 * difference.y,
    );
    const midpoint = from.add(halfDifference);
    const length = Math.sqrt(
      difference.x * difference.x + difference.y * difference.y,
    );
    const theta = Math.atan(difference.y / difference.x);

    const transform = GLM.mat4.create();
    GLM.mat4.translate(
      transform,
      transform,
      GLM.vec3.fromValues(midpoint.x, midpoint.y, ZLevel.Floating),
    );
    GLM.mat4.rotate(transform, transform, theta, GLM.vec3.fromValues(0, 0, 1));
    GLM.mat4.scale(transform, transform, GLM.vec3.fromValues(length, width, 1));

    return transform;
  }
}
