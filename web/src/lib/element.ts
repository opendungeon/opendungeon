import Shader from "./shader";
import * as GLM from "gl-matrix";

export class Color {
  r: number;
  g: number;
  b: number;
  a: number;

  constructor(r: number, g: number, b: number, a = 1) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }
}

export class Transform {
  private matrix: GLM.mat4;

  constructor() {
    this.matrix = GLM.mat4.create();
  }

  toArray(): Float32Array {
    return this.matrix as Float32Array;
  }

  translate(x: number, y: number, z: number) {
    GLM.mat4.translate(this.matrix, this.matrix, GLM.vec3.fromValues(x, y, z));
  }

  scale(x: number, y: number) {
    GLM.mat4.scale(this.matrix, this.matrix, GLM.vec3.fromValues(x, y, 1));
  }
}

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

  setColor(color: Color) {
    const colorUniform = this.shader.gl.getUniformLocation(
      this.shader.program,
      "u_color",
    );
    if (!colorUniform) {
      throw new Error("failed to get color uniform location");
    }

    const colorBuffer = new Float32Array([color.r, color.g, color.b, color.a]);
    this.shader.gl.uniform4fv(colorUniform, colorBuffer);
  }

  setTransform(transform: GLM.mat4) {
    const transformUniform = this.shader.gl.getUniformLocation(
      this.shader.program,
      "u_transform",
    );
    if (!transformUniform) {
      throw new Error("failed to get transform uniform location");
    }

    this.shader.gl.uniformMatrix4fv(transformUniform, false, transform);
  }

  setTexture(texture: number) {
    const textureUniform = this.shader.gl.getUniformLocation(
      this.shader.program,
      "u_texture",
    );
    if (!textureUniform) {
      throw new Error("failed to get texture uniform location");
    }

    this.shader.gl.uniform1i(textureUniform, texture);
  }
}
