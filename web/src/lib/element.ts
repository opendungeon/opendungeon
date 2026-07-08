import Shader from "./shader";

type VertexAttribute = {
  name: string;
  size: number;
  type: GLenum;
  normalized: boolean;
  byteOffset: number;
};

type VertexLayout = {
  byteStride: number;
  attributes: VertexAttribute[];
};

export default class Element {
  private shader: Shader;
  private vertexArray: WebGLVertexArrayObject;
  private vertexBuffer: WebGLBuffer;
  private elementBuffer: WebGLBuffer;
  private count: number;

  constructor(
    shader: Shader,
    vertices: Float32Array,
    indices: Uint16Array,
    layout: VertexLayout,
  ) {
    this.shader = shader;

    this.vertexArray = this.shader.gl.createVertexArray();
    this.vertexBuffer = this.shader.gl.createBuffer();
    this.elementBuffer = this.shader.gl.createBuffer();
    this.count = indices.length;

    this.shader.gl.bindVertexArray(this.vertexArray); // MUST GO FIRST

    // bind vertices
    this.shader.gl.bindBuffer(this.shader.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.shader.gl.bufferData(
      this.shader.gl.ARRAY_BUFFER,
      vertices,
      this.shader.gl.STATIC_DRAW,
    );

    // bind indices (instructs GL how to construct a shape from the vertices)
    this.shader.gl.bindBuffer(
      this.shader.gl.ELEMENT_ARRAY_BUFFER,
      this.elementBuffer,
    );
    this.shader.gl.bufferData(
      this.shader.gl.ELEMENT_ARRAY_BUFFER,
      indices,
      this.shader.gl.STATIC_DRAW,
    );

    for (let i = 0; i < layout.attributes.length; i++) {
      const attribute = layout.attributes[i]!;
      const location = this.shader.gl.getAttribLocation(
        this.shader.program,
        attribute.name,
      );
      if (location === -1) {
        throw new Error(
          `attribute '${attribute.name}' does not exist in shader`,
        );
      }

      this.shader.gl.vertexAttribPointer(
        location,
        attribute.size,
        attribute.type,
        attribute.normalized,
        layout.byteStride,
        attribute.byteOffset,
      );
      this.shader.gl.enableVertexAttribArray(location);
    }
  }

  destroy() {
    this.shader.gl.deleteVertexArray(this.vertexArray);
    this.shader.gl.deleteBuffer(this.vertexBuffer);
    this.shader.destroy();
  }

  use() {
    this.shader.use();
    this.shader.gl.bindVertexArray(this.vertexArray);
  }

  draw() {
    this.shader.gl.drawElements(
      this.shader.gl.TRIANGLES,
      this.count,
      this.shader.gl.UNSIGNED_SHORT,
      0,
    );
  }

  setUniform4fv(name: string, value: Float32Array) {
    const location = this.shader.uniformLocations.get(name);
    if (!location) {
      throw new Error(`failed to get location for uniform '${name}'`);
    }

    this.shader.gl.uniform4fv(location, value);
  }

  setUniformMatrix4fv(name: string, value: Iterable<GLfloat>) {
    const location = this.shader.uniformLocations.get(name);
    if (!location) {
      throw new Error(`failed to get location for uniform '${name}'`);
    }

    this.shader.gl.uniformMatrix4fv(location, false, value);
  }

  setUniform1i(name: string, value: number) {
    const location = this.shader.uniformLocations.get(name);
    if (!location) {
      throw new Error(`failed to get location for uniform '${name}'`);
    }

    this.shader.gl.uniform1i(location, value);
  }

  setUniform1f(name: string, value: number) {
    const location = this.shader.uniformLocations.get(name);
    if (!location) {
      throw new Error(`failed to get location for uniform '${name}'`);
    }

    this.shader.gl.uniform1f(location, value);
  }

  setUniformBool(name: string, value: boolean) {
    this.setUniform1i(name, value ? 1 : 0);
  }
}
