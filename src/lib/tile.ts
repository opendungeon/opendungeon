import {
  FLOAT_BYTE_SIZE,
  MAT4_FLOAT_SIZE,
  VEC3_FLOAT_SIZE,
  VEC4_FLOAT_SIZE,
  BaseRenderElement,
  type BatchRenderElement,
  type Camera,
  type Renderer,
  Shader,
} from "odr";
import tileVertexShader from "#lib/assets/shaders/tile.vert?raw";
import tileFragmentShader from "#lib/assets/shaders/tile.frag?raw";

export default class Tile implements BatchRenderElement {
  static readonly vertices = new Float32Array([
    0.5, 0.5, 0.0, 0.5, -0.5, 0.0, -0.5, -0.5, 0.0, -0.5, 0.5, 0.0,
  ]);

  static readonly indices = new Uint16Array([3, 1, 0, 3, 2, 1]);

  private element: BaseRenderElement;

  constructor(renderer: Renderer) {
    const shader = new Shader(renderer.gl, tileVertexShader, tileFragmentShader);

    shader.loadUniformLocation("u_view");
    shader.loadUniformLocation("u_projection");
    shader.loadUniformLocation("u_texture");

    this.element = new BaseRenderElement(
      shader,
      Tile.vertices,
      Tile.indices,
      {
        byteStride: VEC3_FLOAT_SIZE * FLOAT_BYTE_SIZE,
        attributes: [
          {
            name: "a_vertex_position",
            size: VEC3_FLOAT_SIZE,
            type: renderer.gl.FLOAT,
            normalized: false,
            byteOffset: 0,
          },
        ],
      },
      {
        byteStride: MAT4_FLOAT_SIZE * FLOAT_BYTE_SIZE + VEC4_FLOAT_SIZE * FLOAT_BYTE_SIZE,
        attributes: [
          {
            name: "a_model",
            size: VEC4_FLOAT_SIZE,
            type: renderer.gl.FLOAT,
            normalized: false,
            byteOffset: 0,
            locations: 4,
          },
          {
            name: "a_color",
            size: VEC4_FLOAT_SIZE,
            type: renderer.gl.FLOAT,
            normalized: false,
            byteOffset: MAT4_FLOAT_SIZE * FLOAT_BYTE_SIZE,
          },
        ],
      },
    );
  }

  get instanceSize(): number {
    return this.element.instanceSize;
  }

  use() {
    this.element.use();
  }

  allocate(count: number): Float32Array {
    return this.element.allocate(count);
  }

  draw() {
    this.element.draw();
  }

  destroy() {
    this.element.destroy();
  }

  setCamera(camera: Camera) {
    this.element.setUniformMatrix4fv("u_view", camera.view as Float32Array);
    this.element.setUniformMatrix4fv("u_projection", camera.projection as Float32Array);
  }
}
