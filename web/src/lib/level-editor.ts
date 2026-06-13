import Controller, { MouseButton } from "./controller";
import type Game from "./game";
import HexagonalGrid from "./hexagonal-grid";
import Rectangle from "./rectangle";
import Renderer from "./renderer";
import * as GLM from "gl-matrix";
import hexagonTexture from "../assets/white-hex.png";
import outlineTexture from "../assets/outline.png";
import grassTexture from "../assets/grass.png";
import waterTexture from "../assets/water.png";
import mudTexture from "../assets/mud.png";
import highlightTexture from "../assets/highlight.png";
import { Axial, Cartesian, Cube } from "./point";
import Texture from "./texture";

const HEXAGON_WIDTH = 1 / Math.sqrt(3);
const HEXAGON_HEIGHT = 0.25;
const DEFAULT_GRID_WIDTH = 64;
const DEFAULT_GRID_HEIGHT = 128;
const CELL_COLORS: Record<number, Float32Array> = {
  1: new Float32Array([0.0, 0.8, 0.0, 0.5]),
  2: new Float32Array([0.8, 0.8, 0.0, 0.5]),
};

export type LevelEditorViewMode = "texture" | "weight";

export type BrushTool =
  | { type: "weightbrush"; weight: number }
  | { type: "texturebrush"; texture: string | null };

export type LevelEditorTool =
  | BrushTool
  | { type: "measure"; start: Axial | null };

export const DEFAULT_TOOL: LevelEditorTool = {
  type: "texturebrush",
  texture: null,
};

export default class LevelEditor implements Game {
  private renderer: Renderer | undefined;
  private windowWidth: number = 0;
  private windowHeight: number = 0;
  private grid: HexagonalGrid<{ weight: number; texture: string | null }> =
    new HexagonalGrid(DEFAULT_GRID_WIDTH, DEFAULT_GRID_HEIGHT, {
      weight: 0,
      texture: null,
    });
  private camera: GLM.mat4 = GLM.mat4.create();
  private controller: Controller | undefined;
  private input: { type: "none" } | { type: "dragging"; button: MouseButton } =
    {
      type: "none",
    };
  private cursorLocation: Axial | null = null;
  tool: LevelEditorTool = DEFAULT_TOOL;
  viewMode: LevelEditorViewMode = "texture";

  async start(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas, {
      resizeToWindow: true,
      backgroundColor: new Float32Array([0.06, 0.06, 0.06, 1.0]),
    });
    this.renderer.createElement("rectangle", Rectangle);
    await Promise.all(
      (
        [
          ["plain", hexagonTexture],
          ["outline", outlineTexture],
          ["grass", grassTexture],
          ["water", waterTexture],
          ["mud", mudTexture],
          ["line", new Texture(1, 1)],
          ["highlight", highlightTexture],
        ] as const
      ).map(([name, src]) =>
        this.renderer!.loadTexture(name, src, { mode: "nearest" }),
      ),
    );

    this.controller = new Controller(canvas);

    this.windowWidth = canvas.width;
    this.windowHeight = canvas.height;
    canvas.addEventListener("resize", () => {
      this.windowWidth = canvas.width;
    });

    GLM.mat4.scale(
      this.camera,
      this.camera,
      GLM.vec3.fromValues(0.25, 0.25, 1),
    );

    GLM.mat4.translate(
      this.camera,
      this.camera,
      GLM.vec3.fromValues(
        (-DEFAULT_GRID_WIDTH * HEXAGON_WIDTH) / 1.25, // idk why `1.25` centers the camera, but it does
        (-DEFAULT_GRID_HEIGHT * HEXAGON_HEIGHT) / 1.25,
        0,
      ),
    );
  }

  update() {
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
            if (
              this.tool.type === "texturebrush" &&
              this.input.button === MouseButton.Left
            ) {
              this.paintCellTexture(event.x, event.y, this.tool.texture);
            }

            if (
              this.tool.type === "weightbrush" &&
              this.input.button === MouseButton.Left
            ) {
              this.paintCellWeight(event.x, event.y, this.tool.weight);
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
            const scale = GLM.mat4.create();
            GLM.mat4.getScaling(scale, this.camera);
            const [scaleX, scaleY] = scale;
            const x = (2 * event.deltaX) / this.windowWidth / scaleX;
            const y = (2 * event.deltaY) / this.windowWidth / scaleY;
            GLM.mat4.translate(
              this.camera,
              this.camera,
              GLM.vec3.fromValues(x, y, 0),
            );
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
          const scale = event.delta > 0 ? 0.9 : 1.1;
          const scaleMat = GLM.mat4.create();
          GLM.mat4.fromScaling(scaleMat, GLM.vec3.fromValues(scale, scale, 1));
          GLM.mat4.multiply(this.camera, scaleMat, this.camera);
          break;
        }
      }
    }
  }

  draw() {
    const rectangle = this.renderer!.getAndUseElement("rectangle");
    this.renderer!.clear();

    // draw cell contents (include an overlay if in "weight" mode)
    for (const cell of this.grid.cells) {
      if (!cell.value.texture) {
        continue;
      }

      this.renderer!.useTexture(cell.value.texture);
      rectangle.setUniform4fv(
        "u_color",
        new Float32Array([
          1.0,
          1.0,
          1.0,
          this.viewMode === "weight" ? 0.5 : 1.0,
        ]),
      );

      const transform = this.renderer!.getWorldTransform();
      GLM.mat4.multiply(transform, transform, this.camera);
      const { x, y } = cell.point.toCartesian(HEXAGON_WIDTH, HEXAGON_HEIGHT);
      GLM.mat4.translate(transform, transform, GLM.vec3.fromValues(x, y, 0));
      GLM.mat4.scale(transform, transform, GLM.vec3.fromValues(1, 0.5, 1));
      rectangle.setUniformMatrix4fv("u_transform", transform);

      rectangle.draw();
    }

    if (this.viewMode === "weight") {
      this.renderer!.useTexture("plain");
      for (const cell of this.grid.cells) {
        if (cell.value.weight === 0) {
          continue;
        }

        rectangle.setUniform4fv("u_color", CELL_COLORS[cell.value.weight]);

        const transform = this.renderer!.getWorldTransform();
        GLM.mat4.multiply(transform, transform, this.camera);
        const { x, y } = cell.point.toCartesian(HEXAGON_WIDTH, HEXAGON_HEIGHT);
        GLM.mat4.translate(transform, transform, GLM.vec3.fromValues(x, y, 0));
        GLM.mat4.scale(transform, transform, GLM.vec3.fromValues(1, 0.5, 1));
        rectangle.setUniformMatrix4fv("u_transform", transform);

        rectangle.draw();
      }
    }

    // draw cell outlines
    this.renderer!.useTexture("outline");
    for (const cell of this.grid.cells) {
      const color =
        !!this.cursorLocation && cell.point.isEqual(this.cursorLocation)
          ? new Float32Array([1, 1, 1, 0.5])
          : new Float32Array([0, 0, 0, 0.3]);
      rectangle.setUniform4fv("u_color", color);

      const transform = this.renderer!.getWorldTransform();
      GLM.mat4.multiply(transform, transform, this.camera);
      const { x, y } = cell.point.toCartesian(HEXAGON_WIDTH, HEXAGON_HEIGHT);
      GLM.mat4.translate(transform, transform, GLM.vec3.fromValues(x, y, 0));
      GLM.mat4.scale(transform, transform, GLM.vec3.fromValues(1, 0.5, 1));
      rectangle.setUniformMatrix4fv("u_transform", transform);

      rectangle.draw();
    }

    // draw measure lines
    if (
      this.tool.type === "measure" &&
      !!this.tool.start &&
      !!this.cursorLocation &&
      !!this.grid.getCell(this.cursorLocation)
    ) {
      const start = this.tool.start.toCartesian(HEXAGON_WIDTH, HEXAGON_HEIGHT);
      const end = this.cursorLocation.toCartesian(
        HEXAGON_WIDTH,
        HEXAGON_HEIGHT,
      );

      // highlight cells
      const startCube = start.toCube(HEXAGON_WIDTH, HEXAGON_HEIGHT);
      const endCube = end.toCube(HEXAGON_WIDTH, HEXAGON_HEIGHT);
      const distance = Cube.distance(startCube, endCube);
      this.renderer!.useTexture("highlight");
      for (let i = 0; i <= distance; i++) {
        const point = Cube.round(startCube.lerp(endCube, (1 / distance) * i));

        const color =
          (this.grid.getCell(point.toAxial())?.value.weight ?? 0) !== 0
            ? new Float32Array([1, 1, 1, 0.3])
            : new Float32Array([1, 0, 0, 0.3]);
        rectangle.setUniform4fv("u_color", color);

        const { x, y } = point.toCartesian(HEXAGON_WIDTH, HEXAGON_HEIGHT);
        const transform = this.renderer!.getWorldTransform();
        GLM.mat4.multiply(transform, transform, this.camera);
        GLM.mat4.translate(transform, transform, GLM.vec3.fromValues(x, y, 0));
        GLM.mat4.scale(transform, transform, GLM.vec3.fromValues(1, 0.5, 1));
        rectangle.setUniformMatrix4fv("u_transform", transform);

        rectangle.draw();
      }

      // draw line
      this.renderer!.useTexture("line");
      const transform = this.createLineTransform(start, end, 0.05);
      rectangle.setUniformMatrix4fv("u_transform", transform);
      rectangle.setUniform4fv("u_color", new Float32Array([1, 1, 1, 1]));

      rectangle.draw();
    }
  }

  destroy() {
    this.renderer?.destroy();
  }

  private canvasCoordToAxial(x: number, y: number): Axial {
    // flip coords to match the bottom down GL orientation
    const ndcX = (x / this.windowWidth) * 2 - 1;
    const ndcY = 1 - (y / this.windowHeight) * 2;

    // get inverse of world * camera transforms
    const combined = GLM.mat4.create();
    const worldTransform = this.renderer!.getWorldTransform(); // S(1, aspectRatio, 1)
    GLM.mat4.multiply(combined, worldTransform, this.camera);
    const inverse = GLM.mat4.create();
    GLM.mat4.invert(inverse, combined);

    // calculate final transform
    const ndcPos = GLM.vec4.fromValues(ndcX, ndcY, 0, 1);
    const worldPos = GLM.vec4.create();
    GLM.vec4.transformMat4(worldPos, ndcPos, inverse);
    const worldX = worldPos[0];
    const worldY = worldPos[1];

    const point = new Cartesian(worldX, worldY);
    return point.toAxial(HEXAGON_WIDTH, HEXAGON_HEIGHT);
  }

  private paintCellWeight(x: number, y: number, weight: number) {
    const axial = this.canvasCoordToAxial(x, y);

    const original = this.grid.getCell(axial);
    if (!original) {
      return;
    }

    this.grid.setCell(axial, { ...original.value, weight });
  }

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

    const transform = this.renderer!.getWorldTransform();
    GLM.mat4.multiply(transform, transform, this.camera);
    GLM.mat4.translate(
      transform,
      transform,
      GLM.vec3.fromValues(midpoint.x, midpoint.y, 0),
    );
    GLM.mat4.rotate(transform, transform, theta, GLM.vec3.fromValues(0, 0, 1));
    GLM.mat4.scale(transform, transform, GLM.vec3.fromValues(length, width, 1));

    return transform;
  }
}
