import {
  FLOAT_BYTE_SIZE,
  MAT4_FLOAT_SIZE,
  VEC2_FLOAT_SIZE,
  VEC3_FLOAT_SIZE,
  VEC4_FLOAT_SIZE,
} from "./renderer/consts";
import Element from "./renderer/element";
import Shader from "./renderer/shader";
import vertexShader from "../assets/shaders/hexagon.vert?raw";
import fragmentShader from "../assets/shaders/hexagon.frag?raw";
import type Camera from "./renderer/camera";

export default class Hexagon extends Element {
  // use 6 triangle hexagon for simpler border creation
  // prettier-ignore
  static readonly vertices = new Float32Array([
    0, 0, 0, 1, 1,                        // center
    0, 0.5, 0, 1, 0,                      // top
    -Math.sqrt(3) / 4, 0.25, 0, 0, 0.5,   // top left
    -Math.sqrt(3) / 4, -0.25, 0, 0, 1.5,  // bottom left
    0, -0.5, 0, 1, 2,                     // bottom
    Math.sqrt(3) / 4, -0.25, 0, 2, 1.5,   // bottom right
    Math.sqrt(3) / 4, 0.25, 0, 2, 0.5     // top right
  ]);

  // prettier-ignore
  static readonly indices = new Uint16Array([
    0, 1, 2,
    0, 2, 3,
    0, 3, 4,
    0, 4, 5,
    0, 5, 6,
    0, 6, 1,
  ]);

  constructor(gl: WebGL2RenderingContext) {
    const shader = new Shader(gl, vertexShader, fragmentShader);

    shader.loadUniformLocation("u_view");
    shader.loadUniformLocation("u_projection");
    shader.loadUniformLocation("u_texture");
    shader.loadUniformLocation("u_enable_border");
    shader.loadUniformLocation("u_border_thickness");

    super(
      shader,
      Hexagon.vertices,
      Hexagon.indices,
      {
        byteStride:
          VEC3_FLOAT_SIZE * FLOAT_BYTE_SIZE + VEC2_FLOAT_SIZE * FLOAT_BYTE_SIZE,
        attributes: [
          {
            name: "a_vertex_position",
            size: VEC3_FLOAT_SIZE,
            type: gl.FLOAT,
            normalized: false,
            byteOffset: 0,
          },
          {
            name: "a_texture_coordinate",
            size: VEC2_FLOAT_SIZE,
            type: gl.FLOAT,
            normalized: false,
            byteOffset: VEC3_FLOAT_SIZE * FLOAT_BYTE_SIZE,
          },
        ],
      },
      {
        byteStride:
          MAT4_FLOAT_SIZE * FLOAT_BYTE_SIZE +
          VEC4_FLOAT_SIZE * FLOAT_BYTE_SIZE +
          VEC4_FLOAT_SIZE * FLOAT_BYTE_SIZE,
        attributes: [
          {
            name: "a_model",
            size: VEC4_FLOAT_SIZE,
            type: gl.FLOAT,
            normalized: false,
            byteOffset: 0,
            locations: 4,
          },
          {
            name: "a_color",
            size: VEC4_FLOAT_SIZE,
            type: gl.FLOAT,
            normalized: false,
            byteOffset: MAT4_FLOAT_SIZE * FLOAT_BYTE_SIZE,
          },
          {
            name: "a_border_color",
            size: VEC4_FLOAT_SIZE,
            type: gl.FLOAT,
            normalized: false,
            byteOffset:
              MAT4_FLOAT_SIZE * FLOAT_BYTE_SIZE +
              VEC4_FLOAT_SIZE * FLOAT_BYTE_SIZE,
          },
        ],
      },
    );
  }

  setCamera(camera: Camera) {
    super.setUniformMatrix4fv("u_view", camera.view);
    super.setUniformMatrix4fv("u_projection", camera.projection);
  }

  enableBorder(thickness: number) {
    super.setUniformBool("u_enable_border", true);
    super.setUniform1f("u_border_thickness", thickness);
  }

  disableBorder() {
    super.setUniformBool("u_enable_border", false);
  }
}
