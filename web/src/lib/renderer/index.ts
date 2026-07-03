import Element from "./element";
import Texture from "./texture";

type TextureOptions = {
  mode?: "nearest" | "linear";
  repeat?: boolean;
};

type RenderOptions = {
  backgroundColor?: Float32Array<ArrayBuffer>;
  resizeToWindow?: boolean;
};

export interface BatchDrawable {
  texture: string;
  loadData(buffer: Float32Array): void;
}

type Batch = {
  texture: string;
  offset: number;
  count: number;
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

    this.gl.enable(this.gl.DEPTH_TEST);
  }

  clear() {
    this.gl.clearColor(
      this.backgroundColor[0],
      this.backgroundColor[1],
      this.backgroundColor[2],
      this.backgroundColor[3],
    );
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
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

    this.activeTexture = null; // clear texture to avoid messing up new element
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

            // allow remote images in dev environment
            if (import.meta.env.DEV) {
              image.crossOrigin = "anonymous";
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
      this.gl.texParameteri(
        this.gl.TEXTURE_2D,
        this.gl.TEXTURE_WRAP_S,
        this.gl.REPEAT,
      );
      this.gl.texParameteri(
        this.gl.TEXTURE_2D,
        this.gl.TEXTURE_WRAP_T,
        this.gl.REPEAT,
      );
    } else {
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
    }

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

  static createBatchesByTexture<T extends { texture: string }>(
    instances: T[],
  ): Batch[] {
    const textureCounts = instances.reduce((map, instance) => {
      const count = map.get(instance.texture) ?? 0;
      return map.set(instance.texture, count + 1);
    }, new Map<string, number>());

    const { batches } = Array.from(textureCounts.entries()).reduce<{
      totalOffset: number;
      batches: Batch[];
    }>(
      ({ totalOffset, batches }, [texture, count]) => {
        return {
          totalOffset: totalOffset + count,
          batches: [...batches, { texture, count, offset: totalOffset }],
        };
      },
      { totalOffset: 0, batches: [] },
    );

    return batches;
  }

  drawBatch(element: Element, instances: BatchDrawable[]) {
    const buffer = new Float32Array(
      element.floatsPerInstance * instances.length,
    );

    const batches = Renderer.createBatchesByTexture(instances);
    const loadedInstances = new Map(
      batches.map<[string, { offset: number; written: number }]>(
        ({ texture, offset }) => [texture, { offset, written: 0 }],
      ),
    );

    for (const instance of instances) {
      const loadedInstance = loadedInstances.get(instance.texture)!;
      const offset = loadedInstance.offset + loadedInstance.written;

      instance.loadData(
        buffer.subarray(
          offset * element.floatsPerInstance,
          (offset + 1) * element.floatsPerInstance,
        ),
      );

      loadedInstances.set(instance.texture, {
        ...loadedInstance,
        written: loadedInstance.written + 1,
      });
    }

    for (const { texture, offset, count } of batches) {
      this.useTexture(texture);
      const subdata = buffer.subarray(
        offset * element.floatsPerInstance,
        (offset + count) * element.floatsPerInstance,
      );
      element.uploadInstanceData(subdata);
      element.drawInstanced(count);
    }
  }
}
