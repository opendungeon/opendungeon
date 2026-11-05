import billboardFragmentShader from "#lib/assets/shaders/billboard.frag?raw";
import billboardVertexShader from "#lib/assets/shaders/billboard.vert?raw";
import {
  BaseRenderElement,
  type BatchRenderElement,
  type Camera,
  FLOAT_BYTE_SIZE,
  MAT4_FLOAT_SIZE,
  Renderer,
  Shader,
  VEC3_FLOAT_SIZE,
  VEC4_FLOAT_SIZE,
  VEC2_FLOAT_SIZE,
} from "@opendungeon/renderer";
import * as GLM from "gl-matrix";

export default class Billboard implements BatchRenderElement {
  static readonly vertices = new Float32Array([
    0.5, 0.5, 0.0, 1.0, 0.0, 0.5, -0.5, 0.0, 1.0, 1.0, -0.5, -0.5, 0.0, 0.0, 1.0, -0.5, 0.5, 0.0,
    0.0, 0.0,
  ]);

  static readonly indices = new Uint16Array([3, 1, 0, 3, 2, 1]);

  private element: BaseRenderElement;

  constructor(renderer: Renderer) {
    const shader = new Shader(renderer.gl, billboardVertexShader, billboardFragmentShader);

    shader.loadUniformLocation("u_view");
    shader.loadUniformLocation("u_projection");
    shader.loadUniformLocation("u_texture");
    shader.loadUniformLocation("u_camera_right");
    shader.loadUniformLocation("u_camera_up");

    this.element = new BaseRenderElement(
      shader,
      Billboard.vertices,
      Billboard.indices,
      {
        byteStride: VEC3_FLOAT_SIZE * FLOAT_BYTE_SIZE + VEC2_FLOAT_SIZE * FLOAT_BYTE_SIZE,
        attributes: [
          {
            name: "a_vertex_position",
            size: VEC3_FLOAT_SIZE,
            type: renderer.gl.FLOAT,
            normalized: false,
            byteOffset: 0,
          },
          {
            name: "a_texture_coordinate",
            size: VEC2_FLOAT_SIZE,
            type: renderer.gl.FLOAT,
            normalized: false,
            byteOffset: VEC3_FLOAT_SIZE * FLOAT_BYTE_SIZE,
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

    const cameraRight = GLM.vec3.fromValues(camera.view[0], camera.view[4], camera.view[8]);
    const cameraUp = GLM.vec3.fromValues(camera.view[1], camera.view[5], camera.view[9]);
    this.element.setUniform3f("u_camera_right", cameraRight as Float32Array);
    this.element.setUniform3f("u_camera_up", cameraUp as Float32Array);
  }
}
