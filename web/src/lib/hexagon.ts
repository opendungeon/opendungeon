import { ByteSize, FloatSize } from "./renderer/consts";
import Element from "./renderer/element";
import Shader from "./renderer/shader";

// modified shader that allows for borders
const vertexShader = `
  attribute vec3 a_vertex_position;
  attribute vec2 a_texture_coordinate;
  attribute mat4 a_model;
  attribute vec4 a_color;
  attribute vec4 a_border_color;

  uniform mat4 u_view;
  uniform mat4 u_projection;

  varying vec4 v_color;
  varying vec4 v_border_color;
  varying vec2 v_local_coord;
  varying vec2 v_tex_coord;

  void main() {
    gl_Position = u_projection * u_view * a_model * vec4(a_vertex_position.x, a_vertex_position.y, a_vertex_position.z, 1.0);
    v_color = a_color;
    v_border_color = a_border_color;
    v_local_coord = a_vertex_position.xy;
    v_tex_coord = a_texture_coordinate;
  }
`;

const fragmentShader = `
  precision mediump float;

  const float SQRT_3_OVER_2 = 0.86602540378; // cos(30deg)
  const float SQRT_3_OVER_4 = 0.43301270189; // cos(30deg)
  const float SIN_30 = 0.5;

  uniform sampler2D u_texture;
  uniform bool u_enable_border;
  uniform float u_border_thickness;

  varying vec4 v_color;
  varying vec4 v_border_color;
  varying vec2 v_local_coord;
  varying vec2 v_tex_coord;

  void main() {
    vec2 p = abs(v_local_coord);

    float distance_to_slanted_edge = (p.y * SQRT_3_OVER_2) + (p.x * SIN_30);
    float distance_to_flat_edge = p.x;
    float distance = max(distance_to_slanted_edge, distance_to_flat_edge);

    float inner_edge = SQRT_3_OVER_4 - u_border_thickness;

    if (!u_enable_border || distance < inner_edge) {
      gl_FragColor = texture2D(u_texture, v_tex_coord) * v_color;
    } else {
      gl_FragColor = v_border_color;
    }
  }
`;

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
          FloatSize.Vec3 * ByteSize.Float + FloatSize.Vec2 * ByteSize.Float,
        attributes: [
          {
            name: "a_vertex_position",
            size: FloatSize.Vec3,
            type: gl.FLOAT,
            normalized: false,
            byteOffset: 0,
          },
          {
            name: "a_texture_coordinate",
            size: FloatSize.Vec2,
            type: gl.FLOAT,
            normalized: false,
            byteOffset: FloatSize.Vec3 * ByteSize.Float,
          },
        ],
      },
      {
        byteStride:
          FloatSize.Mat4 * ByteSize.Float +
          FloatSize.Vec4 * ByteSize.Float +
          FloatSize.Vec4 * ByteSize.Float,
        attributes: [
          {
            name: "a_model",
            size: FloatSize.Vec4,
            type: gl.FLOAT,
            normalized: false,
            byteOffset: 0,
            locations: 4,
          },
          {
            name: "a_color",
            size: FloatSize.Vec4,
            type: gl.FLOAT,
            normalized: false,
            byteOffset: FloatSize.Mat4 * ByteSize.Float,
          },
          {
            name: "a_border_color",
            size: FloatSize.Vec4,
            type: gl.FLOAT,
            normalized: false,
            byteOffset:
              FloatSize.Mat4 * ByteSize.Float + FloatSize.Vec4 * ByteSize.Float,
          },
        ],
      },
    );
  }
}
