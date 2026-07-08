import Element from "./element";
import Shader, { basicVertexShader, basicFragmentShader } from "./shader";

export default class Rectangle extends Element {
  // prettier-ignore
  static readonly vertices = new Float32Array([
    0.5, 0.5, 0.0, 1.0, 0.0,    // defines the location and texture information for each vertex (corner) of the rectangle.
    0.5, -0.5, 0.0, 1.0, 1.0,   // first three numbers are the coordinates of the vertex, the second two are the texture coordinate.
    -0.5, -0.5, 0.0, 0.0, 1.0,  // we *could* separate them into different buffers, but it's more convenient to feed in the data in a single call.
    -0.5, 0.5, 0.0, 0.0, 0.0,
  ]);

  // the indices of each vertex (as defined above) in draw order.
  // technically speaking, a rectangle is two right triangles.
  // `indices` defines the sequence of the vertices to draw the two triangles.
  // prettier-ignore
  static readonly indices = new Uint16Array([
    0, 1, 3,  // triangle 1
    1, 2, 3,  // triangle 2
  ]);

  constructor(gl: WebGL2RenderingContext) {
    const shader = new Shader(gl, basicVertexShader, basicFragmentShader);

    // cache the uniform locations so we can access them without talking to the GPU
    shader.loadUniformLocation("u_model");
    shader.loadUniformLocation("u_view");
    shader.loadUniformLocation("u_projection");
    shader.loadUniformLocation("u_color");
    shader.loadUniformLocation("u_texture");

    super(shader, Rectangle.vertices, Rectangle.indices, {
      byteStride: 20,
      // in order for the GPU to understand the `vertices` buffer, we have to define each section
      // in traditional opengl we'd have to define a `stride` to define how to jump between the sections of the buffer, but webgl is able to calculate it for us
      attributes: [
        // starting at byte index 0 (the beginning), the first 3 float values are the `a_vertex_position` attribute
        {
          name: "a_vertex_position",
          size: 3,
          type: gl.FLOAT,
          normalized: false,
          byteOffset: 0,
        },
        // starting at byte index 12 (float32 is 4 bytes and a_vertex_position has 3 of them, 4 * 3 = 12) the first 2 float values are the `a_texture_coordinate` attribute
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
