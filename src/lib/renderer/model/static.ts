import { type Camera } from "$lib/renderer/camera";
import { MAT4_FLOAT_SIZE } from "$lib/renderer/consts";
import type { BatchRenderElement } from "$lib/renderer/element";
import Shader from "$lib/renderer/shader";
import { type GLTFAlphaMode, type Material, type Mesh, type Node } from "$lib/renderer/model/types";
import ArenaAllocator from "$lib/renderer/arena";
import { DEFAULT_MATERIAL, WHITE } from "$lib/renderer/model/consts";

export default class StaticModel implements BatchRenderElement {
  private shader: Shader;

  private buffers: WebGLBuffer[];
  private materials: Material[];
  private meshes: Mesh[];
  readonly nodes: Node[];
  private textures: WebGLTexture[];

  private transforms: Float32Array;
  private instanceBuffer: WebGLBuffer;
  private instanceArena: ArenaAllocator;

  constructor(
    shader: Shader,
    buffers: WebGLBuffer[],
    materials: Material[],
    meshes: Mesh[],
    textures: WebGLTexture[],
    nodes: Node[],
    transforms: Float32Array,
    instanceBuffer: WebGLBuffer,
  ) {
    this.shader = shader;
    this.buffers = buffers;
    this.materials = materials;
    this.meshes = meshes;
    this.nodes = nodes;
    this.textures = textures;
    this.transforms = transforms;
    this.instanceBuffer = instanceBuffer;
    this.instanceArena = new ArenaAllocator(this.instanceSize, 1);
  }

  get instanceSize(): number {
    return MAT4_FLOAT_SIZE;
  }

  destroy() {
    for (const { vertexArray } of this.meshes.map(({ primitives }) => primitives).flat()) {
      this.shader.gl.deleteVertexArray(vertexArray);
    }

    for (const buffer of this.buffers) {
      this.shader.gl.deleteBuffer(buffer);
    }

    for (const texture of this.textures) {
      this.shader.gl.deleteTexture(texture);
    }

    this.shader.gl.deleteBuffer(this.instanceBuffer);
    this.shader.destroy();
  }

  use() {
    this.shader.use();
  }

  allocate(count: number): Float32Array {
    return this.instanceArena.allocate(count);
  }

  draw() {
    const count = this.instanceArena.size;
    if (count <= 0) {
      return;
    }

    const gl = this.shader.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.instanceArena.buffer, gl.DYNAMIC_DRAW);

    // Pass 1: opaque + mask (write depth, no blending).
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    for (let i = 0; i < this.nodes.length; i++) {
      this.drawNode(i, count, (mode) => mode !== "BLEND");
    }

    // Pass 2: blended (read depth but don't write, blend enabled).
    gl.enable(gl.BLEND);
    gl.depthMask(false);
    for (let i = 0; i < this.nodes.length; i++) {
      this.drawNode(i, count, (mode) => mode === "BLEND");
    }

    // restore defaults for the rest of the frame
    gl.depthMask(true);
    gl.enable(gl.BLEND);

    // unbind for a clean state
    gl.bindTexture(gl.TEXTURE_2D, null);

    this.instanceArena.reset();
  }

  private drawNode(
    nodeIndex: number,
    count: number,
    accept: (alphaMode: GLTFAlphaMode) => boolean,
  ) {
    const node = this.nodes[nodeIndex];
    if (node.mesh === undefined) {
      return;
    }

    const nodeTransform = this.transforms.subarray(
      MAT4_FLOAT_SIZE * nodeIndex,
      MAT4_FLOAT_SIZE * (nodeIndex + 1),
    );
    const mesh = this.meshes[node.mesh];

    const gl = this.shader.gl;
    let uniformSet = false;

    for (const { vertexArray, drawMode, material: matIndex, indices } of mesh.primitives) {
      const material = matIndex === undefined ? DEFAULT_MATERIAL : this.materials[matIndex]!;
      const alphaMode: GLTFAlphaMode = material.alphaMode ?? "OPAQUE";
      if (!accept(alphaMode)) {
        continue;
      }

      if (!uniformSet) {
        this.setUniformMatrix4fv("u_node_transform", nodeTransform);
        uniformSet = true;
      }

      const { baseColorTexture, baseColorFactor } = material;

      if (baseColorTexture !== undefined) {
        const texture = this.textures[baseColorTexture]!;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        this.setUniform1i("u_has_texture", 1);
        this.setUniform1i("u_texture", 0);
        this.setUniform4fv("u_base_color", baseColorFactor as Float32Array);
      } else if (baseColorFactor) {
        this.setUniform1i("u_has_texture", 0);
        this.setUniform4fv("u_base_color", baseColorFactor as Float32Array);
      } else {
        this.setUniform1i("u_has_texture", 0);
        this.setUniform4fv("u_base_color", WHITE);
      }

      // alpha cutoff: only active for MASK; OPAQUE and BLEND disable it.
      const cutoff = alphaMode === "MASK" ? (material.alphaCutoff ?? 0.5) : 0.0;
      this.setUniform1f("u_alpha_cutoff", cutoff);

      // doubleSided disables backface culling.
      if (material.doubleSided) {
        gl.disable(gl.CULL_FACE);
      } else {
        gl.enable(gl.CULL_FACE);
      }

      gl.bindVertexArray(vertexArray);
      gl.drawElementsInstanced(
        drawMode,
        indices.count,
        indices.componentType,
        indices.byteOffset ?? 0,
        count,
      );
    }
  }

  setCamera(camera: Camera) {
    this.setUniformMatrix4fv("u_view", camera.view as Float32Array);
    this.setUniformMatrix4fv("u_projection", camera.projection as Float32Array);
  }

  private setUniformMatrix4fv(name: string, value: Float32Array | number[]) {
    const location = this.shader.uniformLocations.get(name);
    if (location === undefined) {
      throw new Error(`failed to get location for uniform '${name}'`);
    }

    this.shader.gl.uniformMatrix4fv(location, false, value);
  }

  private setUniform4fv(name: string, value: Float32Array | number[]) {
    const location = this.shader.uniformLocations.get(name);
    if (location === undefined) {
      throw new Error(`failed to get location for uniform '${name}'`);
    }

    this.shader.gl.uniform4fv(location, value);
  }

  private setUniform1i(name: string, value: number) {
    const location = this.shader.uniformLocations.get(name);
    if (location === undefined) {
      throw new Error(`failed to get location for uniform '${name}'`);
    }

    this.shader.gl.uniform1i(location, value);
  }

  private setUniform1f(name: string, value: number) {
    const location = this.shader.uniformLocations.get(name);
    if (location === undefined) {
      throw new Error(`failed to get location for uniform '${name}'`);
    }

    this.shader.gl.uniform1f(location, value);
  }
}
