export const basicVertexShader = `
  attribute vec4 a_vertex_position;
  attribute vec2 a_texture_coordinate;

  uniform mat4 u_transform;

  varying vec2 v_texcoord;

  void main() {
    gl_Position = u_transform * vec4(a_vertex_position.x, a_vertex_position.y, a_vertex_position.z, 1.0);

    v_texcoord = a_texture_coordinate;
  }
`;

export const basicFragmentShader = `
  precision mediump float;

  uniform vec4 u_color;
  uniform sampler2D u_texture;

  varying vec2 v_texcoord;

  void main() {
    gl_FragColor = texture2D(u_texture, v_texcoord) * u_color;
  }
`;

export default class Shader {
  readonly gl: WebGL2RenderingContext;
  readonly program: WebGLProgram;

  constructor(
    gl: WebGL2RenderingContext,
    vertexSource: string,
    fragmentSource: string,
  ) {
    this.gl = gl;

    const vertexShader = Shader.load(
      this.gl,
      this.gl.VERTEX_SHADER,
      vertexSource,
    );
    const fragmentShader = Shader.load(
      this.gl,
      this.gl.FRAGMENT_SHADER,
      fragmentSource,
    );

    this.program = this.gl.createProgram();
    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);
    const ok = this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS);
    if (!ok) {
      const log = this.gl.getProgramInfoLog(this.program);
      throw new Error(`failed to link program: ${log}`);
    }

    // clean up now that the program has been linked
    this.gl.deleteShader(vertexShader);
    this.gl.deleteShader(fragmentShader);
  }

  use() {
    this.gl.useProgram(this.program);
  }

  destroy() {
    this.gl.deleteProgram(this.program);
  }

  private static load(
    gl: WebGL2RenderingContext,
    type: GLenum,
    source: string,
  ): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error("failed to create shader");
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const ok = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!ok) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`failed to compile shader: ${log}`);
    }

    return shader;
  }
}
