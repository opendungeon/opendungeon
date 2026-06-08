import Element from "./element";
import Shader, { basicVertexShader, basicFragmentShader } from "./shader";

export default class Rectangle extends Element {
  static readonly vertices = new Float32Array([
    0.5, 0.5, 0.0, 1.0, 1.0, 0.5, -0.5, 0.0, 1.0, 0.0, -0.5, -0.5, 0.0, 0.0,
    0.0, -0.5, 0.5, 0.0, 0.0, 1.0,
  ]);
  static readonly indices = new Uint16Array([0, 1, 3, 1, 2, 3]);

  constructor(gl: WebGL2RenderingContext) {
    const shader = new Shader(gl, basicVertexShader, basicFragmentShader);
    super(shader, Rectangle.vertices, Rectangle.indices, {
      byteStride: 20,
      attributes: [
        {
          name: "a_vertex_position",
          size: 3,
          type: gl.FLOAT,
          normalized: false,
          byteOffset: 0,
        },
        {
          name: "a_texture_coordinate",
          size: 2,
          type: gl.FLOAT,
          normalized: false,
          byteOffset: 12,
        },
      ],
    });
  }
}
