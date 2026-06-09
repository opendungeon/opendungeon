export default class Shader {
  readonly gl: WebGL2RenderingContext;
  readonly program: WebGLProgram;
  readonly uniformLocations: Map<string, WebGLUniformLocation> = new Map();

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

  loadUniformLocation(name: string) {
    const location = this.gl.getUniformLocation(this.program, name);
    if (!location) {
      throw new Error("failed to get color uniform location");
    }

    this.uniformLocations.set(name, location);
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
