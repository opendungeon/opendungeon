import { type Camera } from "$lib/renderer/camera";
import { MAT4_FLOAT_SIZE } from "$lib/renderer/consts";
import type { RenderElement } from "$lib/renderer/element";
import Shader from "$lib/renderer/shader";
import * as GLM from "gl-matrix";
import { type GLTFAlphaMode, GLTFComponentType, type GLTFType } from "$lib/renderer/model/types";
import InstanceGLTF from "$lib/renderer/model/instance";

export const WHITE = new Float32Array([1.0, 1.0, 1.0, 1.0]);
export const MAGENTA = new Float32Array([1.0, 0.0, 1.0, 1.0]);
export const DEFAULT_MATERIAL: Material = {
  name: "default",
  baseColorFactor: MAGENTA,
  alphaMode: "OPAQUE",
  alphaCutoff: 0.5,
  doubleSided: false,
};

export type Animation = {
  duration: number;
  channels: {
    node: number;
    path: "rotation" | "scale" | "translation" | "weights";
    times: { min: number[]; max: number[]; buffer: Float32Array };
    values: { componentType: GLTFComponentType; type: GLTFType; buffer: Float32Array };
  }[];
};

type AlphaMode = "OPAQUE" | "MASK" | "BLEND";

export type Material = {
  name?: string;
  baseColorFactor: GLM.vec4;
  baseColorTexture?: number;
  alphaMode: AlphaMode;
  alphaCutoff: number;
  doubleSided: boolean;
};

export type Primitive = {
  vertexArray: WebGLVertexArrayObject;
  drawMode: GLenum;
  indices: {
    count: number;
    componentType: GLTFComponentType;
    byteOffset?: number;
  };
  material?: number;
};

export type Mesh = {
  primitives: Primitive[];
};

export type Node = {
  globalTransform: number;
  trsOffset: number;
  children: number[];
  mesh?: number;
  skin?: number;
};

export type Skin = {
  inverseBindMatrices: Float32Array;
  joints: number[];
};

export default class DynamicModel implements RenderElement {
  private shader: Shader;

  readonly animations: Record<string, Animation>;
  private buffers: WebGLBuffer[];
  private materials: Material[];
  private meshes: Mesh[];
  readonly nodes: Node[];
  readonly roots: number[];
  readonly skins: Skin[];
  private textures: WebGLTexture[];

  readonly baseTRS: Float32Array;
  private instances: InstanceGLTF[];

  constructor(
    shader: Shader,
    animations: Record<string, Animation>,
    buffers: WebGLBuffer[],
    materials: Material[],
    meshes: Mesh[],
    textures: WebGLTexture[],
    nodes: Node[],
    roots: number[],
    skins: Skin[],
    trsTransforms: Float32Array,
  ) {
    this.shader = shader;
    this.animations = animations;
    this.buffers = buffers;
    this.materials = materials;
    this.meshes = meshes;
    this.nodes = nodes;
    this.textures = textures;
    this.roots = roots;
    this.skins = skins;
    this.baseTRS = trsTransforms;
    this.instances = [];
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
    this.shader.destroy();
  }

  use() {
    this.shader.use();
  }

  createInstance(): InstanceGLTF {
    const instance = new InstanceGLTF(this);
    this.instances.push(instance);
    return instance;
  }

  draw() {
    if (this.instances.length <= 0) {
      return;
    }

    const gl = this.shader.gl;

    // Pass 1: opaque + mask (write depth, no blending).
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    for (const instance of this.instances) {
      for (let i = 0; i < this.nodes.length; i++) {
        this.drawNode(i, instance, (mode) => mode !== "BLEND");
      }
    }

    // Pass 2: blended (read depth but don't write, blend enabled).
    gl.enable(gl.BLEND);
    gl.depthMask(false);
    for (const instance of this.instances) {
      for (let i = 0; i < this.nodes.length; i++) {
        this.drawNode(i, instance, (mode) => mode === "BLEND");
      }
    }

    // restore defaults for the rest of the frame
    gl.depthMask(true);
    gl.enable(gl.BLEND);

    // unbind for a clean state
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  private drawNode(
    nodeIndex: number,
    instance: InstanceGLTF,
    accept: (alphaMode: GLTFAlphaMode) => boolean,
  ) {
    const node = this.nodes[nodeIndex];
    if (node.mesh === undefined) {
      return;
    }

    const nodeTransform = instance.globals.subarray(
      MAT4_FLOAT_SIZE * nodeIndex,
      MAT4_FLOAT_SIZE * (nodeIndex + 1),
    );
    const mesh = this.meshes[node.mesh];

    const gl = this.shader.gl;
    let uniformSet = false;

    for (const { vertexArray, drawMode, indices, material: matIndex } of mesh.primitives) {
      const material = matIndex === undefined ? DEFAULT_MATERIAL : this.materials[matIndex]!;
      const alphaMode: GLTFAlphaMode = material.alphaMode ?? "OPAQUE";
      if (!accept(alphaMode)) {
        continue;
      }

      if (!uniformSet) {
        const model = GLM.mat4.create();
        GLM.mat4.mul(model, instance.transform, nodeTransform);
        this.setUniformMatrix4fv("u_model", model as Float32Array);

        if (node.skin !== undefined) {
          const jointMatrix = instance.jointMatrices[node.skin]; // pick the skin
          this.setUniformMatrix4fv("u_joint_matrix[0]", jointMatrix);
        }
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
        if (this.textures.length > 0) {
          this.setUniform1i("u_has_texture", 0);
        }
        this.setUniform4fv("u_base_color", baseColorFactor as Float32Array);
      } else {
        if (this.textures.length > 0) {
          this.setUniform1i("u_has_texture", 0);
        }
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
      gl.drawElements(drawMode, indices.count, indices.componentType, indices.byteOffset ?? 0);
    }
  }

  setCamera(camera: Camera) {
    this.setUniformMatrix4fv("u_view", camera.view as Float32Array);
    this.setUniformMatrix4fv("u_projection", camera.projection as Float32Array);
  }

  private setUniformMatrix4fv(name: string, value: Float32Array | number[]) {
    const location = this.getUniformLocation(name);
    this.shader.gl.uniformMatrix4fv(location, false, value);
  }

  private setUniform4fv(name: string, value: Float32Array | number[]) {
    const location = this.getUniformLocation(name);
    this.shader.gl.uniform4fv(location, value);
  }

  private setUniform1i(name: string, value: number) {
    const location = this.getUniformLocation(name);
    this.shader.gl.uniform1i(location, value);
  }

  private setUniform1f(name: string, value: number) {
    const location = this.getUniformLocation(name);
    this.shader.gl.uniform1f(location, value);
  }

  private getUniformLocation(name: string): WebGLUniformLocation {
    const location = this.shader.uniformLocations.get(name);
    if (location === undefined) {
      throw new Error(`failed to get location for uniform '${name}'`);
    }

    return location;
  }
}
