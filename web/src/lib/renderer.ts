import * as GLM from "gl-matrix";
import Element from "./element";
import Texture from "./texture";

type TextureOptions = {
  mode?: "nearest" | "linear";
};

type RenderOptions = {
  backgroundColor?: Float32Array<ArrayBuffer>;
  resizeToWindow?: boolean;
};

export default class Renderer {
  gl: WebGL2RenderingContext;
  aspectRatio: number;

  private backgroundColor = new Float32Array([0.0, 0.0, 0.0, 1.0]);
  private elements = new Map<string, Element>();
  private textures = new Map<string, WebGLTexture>();
  activeElement: string | null = null;
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

    const gl = canvas.getContext("webgl2", { antialias: true });
    if (!gl) {
      throw new Error("failed to initialize WebGL");
    }

    this.aspectRatio = canvas.width / canvas.height;
    canvas.addEventListener("resize", (ev) => {
      const target = ev.target! as HTMLCanvasElement;
      this.aspectRatio = target.width / target.height;
    });

    this.gl = gl;

    if (options.backgroundColor) {
      this.backgroundColor = options.backgroundColor;
    }

    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
  }

  clear() {
    this.gl.clearColor(
      this.backgroundColor[0],
      this.backgroundColor[1],
      this.backgroundColor[2],
      this.backgroundColor[3],
    );
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  createElement(
    name: string,
    elementConstructor: new (gl: WebGL2RenderingContext) => Element,
  ) {
    if (this.elements.has(name)) {
      throw new Error(`'${name}' already in use`);
    }

    const element = new elementConstructor(this.gl);
    this.elements.set(name, element);
  }

  deleteElement(name: string) {
    const element = this.elements.get(name);
    if (!element) {
      throw new Error(`'${name}' not found`);
    }

    element.destroy();
    this.elements.delete(name);
  }

  getAndUseElement<T extends Element>(name: string): T {
    const element = this.elements.get(name);
    if (!element) {
      throw new Error(`'${name}' not found`);
    }

    this.activeElement = name;
    element.use();
    return element as T;
  }

  async loadTexture(
    name: string,
    src: string | Texture,
    options: TextureOptions = {},
  ) {
    if (this.textures.has(name)) {
      throw new Error(`'${name}' already in use`);
    }

    const image =
      src instanceof Texture
        ? src
        : await (async () => {
            const image = new Image();
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
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_S,
      this.gl.CLAMP_TO_EDGE,
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_T,
      this.gl.CLAMP_TO_EDGE,
    );
    if (options.mode === "nearest") {
      this.gl.texParameteri(
        this.gl.TEXTURE_2D,
        this.gl.TEXTURE_MIN_FILTER,
        this.gl.NEAREST,
      );
      this.gl.texParameteri(
        this.gl.TEXTURE_2D,
        this.gl.TEXTURE_MAG_FILTER,
        this.gl.NEAREST,
      );
    }

    this.textures.set(name, texture);
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

  getWorldTransform(): GLM.mat4 {
    const transform = GLM.mat4.create();
    GLM.mat4.scale(
      transform,
      transform,
      GLM.vec3.fromValues(1, this.aspectRatio, 1),
    );
    return transform;
  }

  destroy() {
    this.elements.forEach((element) => {
      element.destroy();
    });
    this.elements.clear();
  }
}
