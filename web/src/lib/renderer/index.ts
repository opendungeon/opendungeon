import { Cartesian } from "$lib/point";
import type { Camera } from "$lib/renderer/camera";
import { type RenderElement } from "$lib/renderer/element";
import DynamicGLTF from "$lib/renderer/gltf/dynamic";
import type { GLTFObject } from "./gltf/types";
import Texture from "./texture";
import * as GLM from "gl-matrix";

type RenderElementId = number;

type TextureOptions = {
  mode?: "nearest" | "linear";
  repeat?: boolean;
};

type RenderOptions = {
  backgroundColor?: Float32Array<ArrayBuffer>;
  resizeToWindow?: boolean;
};

export default class Renderer {
  private backgroundColor = new Float32Array([1.0, 1.0, 1.0, 1.0]);
  private elements = new Map<RenderElementId, RenderElement>();
  private textures = new Map<string, WebGLTexture>();
  private elementIdHandle = 0;
  private canvas: HTMLCanvasElement;

  gl: WebGL2RenderingContext;
  aspectRatio: number;
  activeElement: RenderElementId | null = null;
  activeTexture: string | null = null;

  constructor(canvas: HTMLCanvasElement, options: RenderOptions = {}) {
    if (options.resizeToWindow) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      window.addEventListener("resize", () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      });
    }

    const gl = canvas.getContext("webgl2", {
      antialias: true,
    });
    if (!gl) {
      throw new Error("failed to initialize WebGL");
    }

    this.aspectRatio = canvas.width / canvas.height;
    canvas.addEventListener("resize", (ev) => {
      const target = ev.target! as HTMLCanvasElement;
      this.aspectRatio = target.width / target.height;
    });

    this.canvas = canvas;
    this.gl = gl;

    if (options.backgroundColor) {
      this.backgroundColor = options.backgroundColor;
    }

    this.gl.enable(this.gl.CULL_FACE);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    this.gl.enable(this.gl.DEPTH_TEST);
  }

  clear() {
    this.gl.clearColor(
      this.backgroundColor[0]!,
      this.backgroundColor[1]!,
      this.backgroundColor[2]!,
      this.backgroundColor[3]!,
    );
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  }

  createElement(elementConstructor: new (gl: WebGL2RenderingContext) => RenderElement): number {
    const element = new elementConstructor(this.gl);
    return this.loadElement(element);
  }

  async createDynamicGLTFElement(source: GLTFObject): Promise<number> {
    const element = await DynamicGLTF.fromSource(this.gl, source);
    return this.loadElement(element);
  }

  private loadElement(element: RenderElement): number {
    const id = this.elementIdHandle;
    this.elements.set(id, element);
    this.elementIdHandle += 1;
    return id;
  }

  deleteElement(id: RenderElementId) {
    const element = this.elements.get(id);
    if (!element) {
      throw new Error(`element not found`);
    }

    element.destroy();
    this.elements.delete(id);
  }

  getElement<T extends RenderElement>(id: RenderElementId): T {
    const element = this.elements.get(id);
    if (!element) {
      throw new Error(`element "${id}" not found`);
    }

    return element as T;
  }

  getAndUseElement<T extends RenderElement>(id: RenderElementId): T {
    const element = this.elements.get(id);
    if (!element) {
      throw new Error(`element "${id}" not found`);
    }

    this.activeTexture = null; // clear texture to avoid messing up new element
    this.activeElement = id;
    element.use();
    return element as T;
  }

  async loadTexture(name: string, src: string | Texture, options: TextureOptions = {}) {
    if (this.textures.has(name)) {
      throw new Error(`'${name}' already in use`);
    }

    const image =
      src instanceof Texture
        ? src
        : await (async () => {
            const image = new Image();

            // allow remote images in dev environment
            if (import.meta.env.DEV) {
              image.crossOrigin = "use-credentials";
            }

            image.src = src;

            await new Promise((res, rej) => {
              image.addEventListener("load", res);
              image.addEventListener("error", rej);
              image.addEventListener("abort", rej);
            });

            return image;
          })();

    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

    if (image instanceof Texture) {
      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,
        this.gl.RGBA,
        image.width,
        image.height,
        0,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        image.data,
      );
    } else {
      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,
        this.gl.RGBA,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        image,
      );
    }
    this.gl.generateMipmap(this.gl.TEXTURE_2D);

    if (options.repeat) {
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
    } else {
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    }

    if (options.mode === "nearest") {
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
    }

    this.textures.set(name, texture);
    this.activeTexture = null;
  }

  useTexture(name: string, unit = 0) {
    if (this.activeTexture === name) {
      return;
    }

    const texture = this.textures.get(name);
    if (!texture) {
      throw new Error(`'${name}' not found`);
    }

    this.gl.activeTexture(this.gl.TEXTURE0 + unit);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.activeTexture = name;
  }

  hasTexture(name: string): boolean {
    return this.textures.has(name);
  }

  destroy() {
    this.elements.forEach((element) => {
      element.destroy();
    });
    this.elements.clear();
  }

  canvasCoordToWorldCoord(camera: Camera, x: number, y: number): Cartesian {
    // normalized device coordinates, all values in [-1, 1]
    const ndcX = (x / this.canvas.width) * 2 - 1;
    const ndcY = 1 - (y / this.canvas.height) * 2;

    // get the inverse of the camera transform (view-projection)
    const viewProjection = GLM.mat4.create();
    GLM.mat4.multiply(viewProjection, camera.projection, camera.view);
    const inverseViewProjection = GLM.mat4.create();
    GLM.mat4.invert(inverseViewProjection, viewProjection);

    // unproject the near and far points on the ray through the pixel
    const nearNDC = GLM.vec4.fromValues(ndcX, ndcY, -1.0, 1.0);
    const farNDC = GLM.vec4.fromValues(ndcX, ndcY, 1.0, 1.0);

    const nearWorld = GLM.vec4.create();
    const farWorld = GLM.vec4.create();
    GLM.vec4.transformMat4(nearWorld, nearNDC, inverseViewProjection);
    GLM.vec4.transformMat4(farWorld, farNDC, inverseViewProjection);

    // perspective divide (no-op for orthographic since w == 1)
    for (let i = 0; i < 3; i++) {
      nearWorld[i] /= nearWorld[3];
      farWorld[i] /= farWorld[3];
    }

    // ray direction goes from the near point to the far point (per-pixel for perspective)
    const rayDirection = GLM.vec3.fromValues(
      farWorld[0] - nearWorld[0],
      farWorld[1] - nearWorld[1],
      farWorld[2] - nearWorld[2],
    );

    // intersect the ray with the z = 0 plane
    const t = -nearWorld[2] / rayDirection[2];
    const worldX = nearWorld[0] + t * rayDirection[0];
    const worldY = nearWorld[1] + t * rayDirection[1];

    return new Cartesian(worldX, worldY);
  }
}
