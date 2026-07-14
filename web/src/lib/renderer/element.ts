import Shader from "$lib/renderer/shader";
import { sizeof } from "$lib/renderer/utils";

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

type InstanceAttribute = {
  name: string;
  size: number;
  type: GLenum;
  normalized: boolean;
  byteOffset: number;
  locations?: number; // defaults to 1
};

type InstanceLayout = {
  byteStride: number;
  attributes: InstanceAttribute[];
};

export default class Element {
  private shader: Shader;
  private vertexArray: WebGLVertexArrayObject;
  private vertexBuffer: WebGLBuffer;
  private elementBuffer: WebGLBuffer;
  private count: number;
  private instanceBuffer: WebGLBuffer;
  private instanceLayout: InstanceLayout | undefined;
  readonly floatsPerInstance: number;

  constructor(
    shader: Shader,
    vertices: Float32Array,
    indices: Uint16Array,
    vertexLayout: VertexLayout,
    instanceLayout?: InstanceLayout,
  ) {
    this.shader = shader;

    this.vertexArray = this.shader.gl.createVertexArray();
    this.vertexBuffer = this.shader.gl.createBuffer();
    this.elementBuffer = this.shader.gl.createBuffer();
    this.instanceBuffer = this.shader.gl.createBuffer();
    this.count = indices.length;

    this.shader.gl.bindVertexArray(this.vertexArray); // MUST GO FIRST

    // bind vertices
    this.shader.gl.bindBuffer(this.shader.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.shader.gl.bufferData(this.shader.gl.ARRAY_BUFFER, vertices, this.shader.gl.STATIC_DRAW);

    // bind indices (instructs GL how to construct a shape from the vertices)
    this.shader.gl.bindBuffer(this.shader.gl.ELEMENT_ARRAY_BUFFER, this.elementBuffer);
    this.shader.gl.bufferData(
      this.shader.gl.ELEMENT_ARRAY_BUFFER,
      indices,
      this.shader.gl.STATIC_DRAW,
    );

    for (let i = 0; i < vertexLayout.attributes.length; i++) {
      const attribute = vertexLayout.attributes[i]!;
      const location = this.shader.gl.getAttribLocation(this.shader.program, attribute.name);
      if (location === -1) {
        throw new Error(`attribute '${attribute.name}' does not exist in shader`);
      }

      this.shader.gl.vertexAttribPointer(
        location,
        attribute.size,
        attribute.type,
        attribute.normalized,
        vertexLayout.byteStride,
        attribute.byteOffset,
      );
      this.shader.gl.enableVertexAttribArray(location);
    }

    // bind instance layout if exists
    this.floatsPerInstance = 0;
    if (!instanceLayout) {
      return;
    }
    this.instanceLayout = instanceLayout;

    this.instanceBuffer = this.shader.gl.createBuffer();
    this.shader.gl.bindBuffer(this.shader.gl.ARRAY_BUFFER, this.instanceBuffer);

    for (let i = 0; i < instanceLayout.attributes.length; i++) {
      const { name, size, type, normalized, byteOffset, ...attribute } =
        instanceLayout.attributes[i]!;
      const locations = attribute.locations ?? 1;

      this.floatsPerInstance += size * locations;

      const base = this.shader.gl.getAttribLocation(this.shader.program, name);
      if (base === -1) {
        throw new Error(`attribute '${name}' does not exist in shader`);
      }

      for (let l = 0; l < locations; l++) {
        this.shader.gl.vertexAttribPointer(
          base + l,
          size,
          type,
          normalized,
          instanceLayout.byteStride,
          byteOffset + l * size * sizeof(this.shader.gl, type),
        );
        this.shader.gl.enableVertexAttribArray(base + l);
        this.shader.gl.vertexAttribDivisor(base + l, 1);
      }
    }
  }

  destroy() {
    this.shader.gl.deleteVertexArray(this.vertexArray);
    this.shader.gl.deleteBuffer(this.vertexBuffer);
    this.shader.gl.deleteBuffer(this.elementBuffer);
    this.shader.gl.deleteBuffer(this.instanceBuffer);
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

  uploadInstanceData(data: Float32Array) {
    if (!this.instanceLayout) {
      throw new Error("element instance layout undefined");
    }

    this.shader.gl.bindVertexArray(this.vertexArray);
    this.shader.gl.bindBuffer(this.shader.gl.ARRAY_BUFFER, this.instanceBuffer);
    this.shader.gl.bufferData(this.shader.gl.ARRAY_BUFFER, data, this.shader.gl.DYNAMIC_DRAW);
  }

  drawInstanced(instanceCount: number) {
    this.shader.gl.drawElementsInstanced(
      this.shader.gl.TRIANGLES,
      this.count,
      this.shader.gl.UNSIGNED_SHORT,
      0,
      instanceCount,
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
