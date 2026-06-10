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
import { Axial, Cartesian } from "./point";

const HEXAGON_WIDTH = 1 / Math.sqrt(3);
const HEXAGON_HEIGHT = 0.25;
const CELL_COLORS: Record<number, Float32Array> = {
  1: new Float32Array([0.0, 0.8, 0.0, 0.5]),
  2: new Float32Array([0.8, 0.8, 0.0, 0.5]),
};
export const DEFAULT_TOOL: LevelEditor["tool"] = {
  type: "weightbrush",
  weight: 0,
};

export default class LevelEditor implements Game {
  private renderer: Renderer | undefined;
  private windowWidth: number = 0;
  private windowHeight: number = 0;
  private grid: HexagonalGrid<{ weight: number; texture: string | null }> =
    new HexagonalGrid(32, 32, {
      weight: 0,
      texture: null,
    });
  private camera: GLM.mat4 = GLM.mat4.create();
  private controller: Controller | undefined;
  private input: { type: "none" } | { type: "dragging"; button: MouseButton } =
    {
      type: "none",
    };
  tool:
    | { type: "weightbrush"; weight: number }
    | { type: "texturebrush"; texture: string | null } = DEFAULT_TOOL;
  viewMode: "texture" | "weight" = "texture";

  async start(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas, { resizeToWindow: true });
    this.renderer.createElement("rectangle", Rectangle);
    await Promise.all(
      [
        ["plain", hexagonTexture],
        ["outline", outlineTexture],
        ["grass", grassTexture],
        ["water", waterTexture],
        ["mud", mudTexture],
      ].map(([name, src]) =>
        this.renderer!.loadTexture(name, src, { mode: "nearest" }),
      ),
    );

    this.controller = new Controller(canvas);

    this.windowWidth = canvas.width;
    this.windowHeight = canvas.height;
    canvas.addEventListener("resize", () => {
      this.windowWidth = canvas.width;
    });
  }

  update() {
    for (const event of this.controller!.getMouseEvents()) {
      switch (event.type) {
        case "clear": {
          this.input = { type: "none" };
          break;
        }
        case "press": {
          this.input = { type: "dragging", button: event.button };
          break;
        }
        case "release": {
          if (this.input.type === "dragging") {
            if (
              this.tool.type === "texturebrush" &&
              this.input.button === MouseButton.Left
            ) {
              this.paintCellTexture(event.x, event.y, this.tool.texture, {
                setDefaultWeight: true,
              });
            }

            this.input = { type: "none" };
          }
          break;
        }
        case "move": {
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
            this.paintCellTexture(event.x, event.y, this.tool.texture, {
              setDefaultWeight: true,
            });
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

    // draw outlines
    this.renderer!.useTexture("outline");
    for (const cell of this.grid.cells) {
      rectangle.setUniform4fv("u_color", new Float32Array([0, 0, 0, 0.3]));

      const transform = this.renderer!.getWorldTransform();
      GLM.mat4.multiply(transform, transform, this.camera);
      const { x, y } = cell.point.toCartesian(HEXAGON_WIDTH, HEXAGON_HEIGHT);
      GLM.mat4.translate(transform, transform, GLM.vec3.fromValues(x, y, 0));
      GLM.mat4.scale(transform, transform, GLM.vec3.fromValues(1, 0.5, 1));
      rectangle.setUniformMatrix4fv("u_transform", transform);

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
    const axial = Axial.fromCartesian(point, HEXAGON_WIDTH, HEXAGON_HEIGHT);
    return axial;
  }

  private paintCellWeight(x: number, y: number, weight: number) {
    const axial = this.canvasCoordToAxial(x, y);

    const original = this.grid.getCell(axial);
    if (!original) {
      return;
    }

    this.grid.setCell(axial, { ...original.value, weight });
  }

  private paintCellTexture(
    x: number,
    y: number,
    texture: string | null,
    options: { setDefaultWeight?: boolean } = {},
  ) {
    const axial = this.canvasCoordToAxial(x, y);

    const original = this.grid.getCell(axial);
    if (!original) {
      return;
    }

    this.grid.setCell(axial, {
      texture,
      weight: options.setDefaultWeight ? 1 : original.value.weight,
    });
  }
}
