import { type Camera } from "$lib/renderer/camera";
import { MAT4_FLOAT_SIZE, TRS_SIZE } from "$lib/renderer/consts";
import type { RenderElement } from "$lib/renderer/element";
import Shader from "$lib/renderer/shader";
import * as GLM from "gl-matrix";
import {
  type GLTFBuffer,
  type GLTFBufferView,
  type GLTFImage,
  type GLTFMesh,
  GLTFPrimitiveMode,
  type GLTFSampler,
  type GLTFTexture,
  type GLTFAccessor,
  type GLTFAlphaMode,
  type GLTFMaterial,
  type GLTFMeshAttribute,
  type GLTFObject,
  type GLTFVec4,
  GLTFViewTarget,
  type GLTFVec3,
  type GLTFScene,
  type GLTFAnimationChannel,
  GLTFComponentType,
  type GLTFType,
} from "$lib/renderer/gltf/types";
import {
  getAccessorByteLength,
  getAttributeInfo,
  getAttributeName,
  loadImage,
  uriToBuffer,
} from "$lib/renderer/gltf/utils";
import vertexTemplate from "$lib/assets/shaders/gltf.tmpl.vert?raw";
import fragmentTemplate from "$lib/assets/shaders/gltf.tmpl.frag?raw";
import Template from "$lib/template";
import assert from "$lib/assert";
import InstanceGLTF from "$lib/renderer/gltf/instance";

const WHITE = new Float32Array([1.0, 1.0, 1.0, 1.0]);
const MAGENTA = new Float32Array([1.0, 0.0, 1.0, 1.0]);
const DEFAULT_MATERIAL: GLTFMaterial = {
  name: "default",
  pbrMetallicRoughness: {
    metallicFactor: 0,
    roughnessFactor: 0,
    baseColorFactor: Array.from(MAGENTA) as GLTFVec4,
  },
};

type LoadedAnimation = {
  duration: number;
  channels: {
    node: number;
    path: GLTFAnimationChannel["target"]["path"];
    times: { min: number[]; max: number[]; buffer: Float32Array };
    values: { componentType: GLTFComponentType; type: GLTFType; buffer: Float32Array };
  }[];
};

type LoadedPrimitive = {
  vertexArray: WebGLVertexArrayObject;
  drawMode: GLenum;
  indices: number;
  material?: number;
};

type LoadedMesh = {
  primitives: LoadedPrimitive[];
};

type LoadedNode = {
  globalTransform: number;
  trsOffset: number;
  children: number[];
  mesh?: number;
  skin?: number;
};

type LoadedSkin = {
  inverseBindMatrices: Float32Array;
  joints: number[];
};

export default class DynamicGLTF implements RenderElement {
  private shader: Shader;

  private accessors: GLTFAccessor[];
  readonly animations: Record<string, LoadedAnimation>;
  private buffers: WebGLBuffer[];
  private materials: GLTFMaterial[];
  private meshes: LoadedMesh[];
  readonly nodes: LoadedNode[];
  readonly scene: GLTFScene;
  readonly skins: LoadedSkin[];
  private textures: WebGLTexture[];

  private textured: boolean;
  readonly jointed: boolean;

  readonly baseTRS: Float32Array;
  private instances: InstanceGLTF[];

  private constructor(
    shader: Shader,
    accessors: GLTFAccessor[],
    animations: Record<string, LoadedAnimation>,
    buffers: WebGLBuffer[],
    materials: GLTFMaterial[],
    meshes: LoadedMesh[],
    textures: WebGLTexture[],
    nodes: LoadedNode[],
    scene: GLTFScene,
    skins: LoadedSkin[],
    trsTransforms: Float32Array,
    textured: boolean,
    jointed: boolean,
  ) {
    this.shader = shader;
    this.accessors = accessors;
    this.animations = animations;
    this.buffers = buffers;
    this.materials = materials;
    this.meshes = meshes;
    this.nodes = nodes;
    this.textures = textures;
    this.scene = scene;
    this.skins = skins;
    this.baseTRS = trsTransforms;
    this.textured = textured;
    this.jointed = jointed;
    this.instances = [];
  }

  static async fromSource(gl: WebGL2RenderingContext, source: GLTFObject): Promise<DynamicGLTF> {
    const {
      accessors,
      animations,
      buffers,
      bufferViews,
      images,
      materials,
      meshes,
      nodes,
      samplers,
      scene,
      scenes,
      skins,
      textures,
    } = source;

    const loadedBuffers = await Promise.all(buffers.map(async ({ uri }) => uriToBuffer(uri)));

    const { texCoords, joints, weights } = meshes
      .flatMap(({ primitives }) => primitives)
      .reduce(
        (acc, curr) => {
          for (const attribute of Object.keys(curr.attributes)) {
            const name = getAttributeName(attribute as GLTFMeshAttribute);
            assert(!!name, `received unknown attribute ${attribute}`);

            if (attribute.startsWith("TEXCOORD")) {
              acc.texCoords.add(name!);
            } else if (attribute.startsWith("JOINTS")) {
              acc.joints.add(name!);
            } else if (attribute.startsWith("WEIGHTS")) {
              acc.weights.add(name!);
            }
          }
          return acc;
        },
        { texCoords: new Set(), joints: new Set(), weights: new Set() },
      );
    const jointed = joints.size >= 1;
    const textured = texCoords.size >= 1;
    const jointMatrixSize = Math.max(0, ...(skins ?? []).map((s) => s.joints.length));

    const maxUniformMatrixSize = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS) / 4;
    assert(
      jointMatrixSize <= maxUniformMatrixSize,
      "model contains more joints that hardware supports",
    );

    const vertexShader = new Template(vertexTemplate).build({
      texCoordCount: texCoords.size,
      jointCount: joints.size,
      weightCount: weights.size,
      jointMatrixSize,
      jointed,
    });
    const fragmentShader = new Template(fragmentTemplate).build({
      texCoordCount: texCoords.size,
      textured,
    });

    const shader = new Shader(gl, vertexShader, fragmentShader);
    shader.loadUniformLocation("u_model");
    shader.loadUniformLocation("u_view");
    shader.loadUniformLocation("u_projection");

    if (textured) {
      shader.loadUniformLocation("u_has_texture");
      shader.loadUniformLocation("u_texture");
    }
    shader.loadUniformLocation("u_base_color");
    shader.loadUniformLocation("u_alpha_cutoff");

    if (jointed) {
      shader.loadUniformLocation("u_joint_matrix[0]");
    }

    gl.bindVertexArray(null);

    // gen buffers
    const glBuffers = bufferViews.map(({ buffer, byteLength, byteOffset, target }, i) => {
      if (!target) {
        console.warn(`missing target in buffer view [${i}]`);
        target = GLTFViewTarget.ArrayBuffer;
      }

      const offset = byteOffset ?? 0;
      const data = loadedBuffers[buffer]!.subarray(offset, offset + byteLength);
      const glBuf = shader.gl.createBuffer();
      shader.gl.bindBuffer(target, glBuf);
      shader.gl.bufferData(target, data, shader.gl.STATIC_DRAW);
      return glBuf;
    });

    // load meshes
    const loadedMeshes = loadMeshes(shader, accessors, meshes, glBuffers, bufferViews);

    // load textures
    const loadedTextures = !textures
      ? []
      : await loadTextures(shader, textures, images, buffers, bufferViews, samplers);

    const defaultScene = scenes[scene];
    if (!defaultScene) {
      throw new Error("default scene is required");
    }

    const trsTransforms = new Float32Array(TRS_SIZE * nodes.length);
    const loadedNodes: LoadedNode[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.matrix) {
        const rotation = GLM.vec4.create();
        const translation = GLM.vec3.create();
        const scale = GLM.vec3.create();
        GLM.mat4.decompose(rotation, translation, scale, GLM.mat4.fromValues(...node.matrix));
        node.rotation = rotation as GLTFVec4;
        node.translation = translation as GLTFVec3;
        node.scale = scale as GLTFVec3;
      }

      const offset = i * TRS_SIZE;

      const translation = !node.translation
        ? GLM.vec3.fromValues(0, 0, 0)
        : GLM.vec3.fromValues(...node.translation);
      trsTransforms.set(translation, offset);

      const rotation = !node.rotation
        ? GLM.vec4.fromValues(0, 0, 0, 1)
        : GLM.vec4.fromValues(...node.rotation);
      trsTransforms.set(rotation, offset + translation.length);

      const scale = !node.scale ? GLM.vec3.fromValues(1, 1, 1) : GLM.vec3.fromValues(...node.scale);
      trsTransforms.set(scale, offset + translation.length + rotation.length);

      loadedNodes.push({
        mesh: node.mesh,
        globalTransform: i,
        skin: node.skin,
        children: node.children ?? [],
        trsOffset: offset,
      });
    }

    const loadedSkins: LoadedSkin[] = [];
    for (const skin of skins ?? []) {
      const accessor = accessors[skin.inverseBindMatrices];
      const bufferView = bufferViews[accessor.bufferView];
      const buffer = loadedBuffers[bufferView.buffer];
      const byteOffset = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
      const slice = buffer.slice(byteOffset, byteOffset + 64 * accessor.count);
      const inverseBindMatrices = new Float32Array(slice.buffer);
      loadedSkins.push({ inverseBindMatrices, joints: skin.joints });
    }

    const loadedAnimations: Record<string, LoadedAnimation> = {};
    for (const [i, animation] of (animations ?? []).entries()) {
      const channels: LoadedAnimation["channels"] = [];
      let duration = -1;

      for (const channel of animation.channels) {
        const sampler = animation.samplers[channel.sampler];
        assert(
          sampler.interpolation === "LINEAR",
          `unsupported interpolation: ${sampler.interpolation}`,
        );

        const inputAccessor = accessors[sampler.input];
        const inputView = bufferViews[inputAccessor.bufferView];
        const inputByteOffset = (inputView.byteOffset ?? 0) + (inputAccessor.byteOffset ?? 0);
        const inputByteLength = getAccessorByteLength(inputAccessor);
        const inputBuffer = new Float32Array(
          loadedBuffers[inputView.buffer].slice(inputByteOffset, inputByteOffset + inputByteLength)
            .buffer,
        );
        const input = {
          min: inputAccessor.min ?? [],
          max: inputAccessor.max ?? [],
          buffer: inputBuffer,
        };

        const channelDuration = inputAccessor.max[0];
        if (channelDuration > duration) {
          duration = channelDuration;
        }

        const outputAccessor = accessors[sampler.output];
        assert(
          outputAccessor.componentType === GLTFComponentType.Float,
          `unsupported animation component type: ${outputAccessor.componentType}`,
        );
        const outputView = bufferViews[outputAccessor.bufferView];
        const outputByteOffset = (outputView.byteOffset ?? 0) + (outputAccessor.byteOffset ?? 0);
        const outputByteLength = getAccessorByteLength(outputAccessor);
        const outputBuffer = new Float32Array(
          loadedBuffers[outputView.buffer].slice(
            outputByteOffset,
            outputByteOffset + outputByteLength,
          ).buffer,
        );
        const output = {
          componentType: outputAccessor.componentType,
          type: outputAccessor.type,
          buffer: outputBuffer,
        };

        channels.push({
          node: channel.target.node,
          path: channel.target.path,
          times: input,
          values: output,
        });
      }

      loadedAnimations[animation.name ?? `animation${i}`] = { duration, channels };
    }

    return new DynamicGLTF(
      shader,
      accessors,
      loadedAnimations,
      glBuffers,
      materials ?? [],
      loadedMeshes,
      loadedTextures,
      loadedNodes,
      defaultScene,
      loadedSkins,
      trsTransforms,
      textured,
      jointed,
    );
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

    for (const { vertexArray, drawMode, material, indices: accessor } of mesh.primitives) {
      const mat = material === undefined ? DEFAULT_MATERIAL : this.materials[material]!;
      const alphaMode: GLTFAlphaMode = mat.alphaMode ?? "OPAQUE";
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

      const indices = this.accessors[accessor]!;
      const pbrMetallicRoughness =
        mat.pbrMetallicRoughness ?? DEFAULT_MATERIAL.pbrMetallicRoughness!;
      const { baseColorTexture, baseColorFactor } = pbrMetallicRoughness;

      if (baseColorTexture) {
        const texture = this.textures[baseColorTexture.index]!;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        this.setUniform1i("u_has_texture", 1);
        this.setUniform1i("u_texture", 0);
        this.setUniform4fv("u_base_color", baseColorFactor ?? WHITE);
      } else if (baseColorFactor) {
        if (this.textured) {
          this.setUniform1i("u_has_texture", 0);
        }
        this.setUniform4fv("u_base_color", baseColorFactor);
      } else {
        if (this.textured) {
          this.setUniform1i("u_has_texture", 0);
        }
        this.setUniform4fv("u_base_color", WHITE);
      }

      // alpha cutoff: only active for MASK; OPAQUE and BLEND disable it.
      const cutoff = alphaMode === "MASK" ? (mat.alphaCutoff ?? 0.5) : 0.0;
      this.setUniform1f("u_alpha_cutoff", cutoff);

      // doubleSided disables backface culling.
      if (mat.doubleSided) {
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

function loadMeshes(
  shader: Shader,
  accessors: GLTFAccessor[],
  meshes: GLTFMesh[],
  buffers: WebGLBuffer[],
  bufferViews: GLTFBufferView[],
): LoadedMesh[] {
  const gl = shader.gl;
  return meshes.map<LoadedMesh>(({ primitives }) => {
    const loadedPrimitives = primitives.map<LoadedPrimitive>(
      ({ attributes, indices, material, mode }, i) => {
        if (material === undefined) {
          console.warn(`missing material on primitive [${i}]`);
        }

        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        const indicesAccessor = accessors[indices]!;
        const indicesBuf = buffers[indicesAccessor.bufferView]!;
        const indicesView = bufferViews[indicesAccessor.bufferView]!;
        if (!indicesView.target) {
          throw new Error(
            `missing required buffer view target in buffer view [${indicesAccessor.bufferView}]`,
          );
        }
        gl.bindBuffer(indicesView.target, indicesBuf);

        for (const [attribute, index] of Object.entries(attributes)) {
          const info = getAttributeInfo(gl, attribute as GLTFMeshAttribute);
          if (!info) {
            console.warn(`attribute "${attribute}" is not supported`);
            continue;
          }

          const accessor = accessors[index]!;
          const glBuf = buffers[accessor.bufferView]!;
          const view = bufferViews[accessor.bufferView]!;
          if (!view.target) {
            console.warn(`missing target in buffer view [${i}]`);
            view.target = GLTFViewTarget.ArrayBuffer;
          }
          gl.bindBuffer(view.target, glBuf);

          const location = gl.getAttribLocation(shader.program, info.name);
          if (location === -1) {
            console.warn(`missing attribute "${info.name}"`);
            continue;
          }

          gl.vertexAttribPointer(
            location,
            info.size,
            info.type,
            info.normalized,
            view.byteStride ?? 0,
            accessor.byteOffset ?? 0,
          );
          gl.enableVertexAttribArray(location);
        }

        return {
          vertexArray: vao,
          drawMode: mode ?? GLTFPrimitiveMode.Triangles,
          material,
          indices,
        };
      },
    );

    return { primitives: loadedPrimitives };
  });
}

async function loadTextures(
  shader: Shader,
  textures: GLTFTexture[],
  images: GLTFImage[],
  buffers: GLTFBuffer[],
  bufferViews: GLTFBufferView[],
  samplers: GLTFSampler[],
): Promise<WebGLTexture[]> {
  const gl = shader.gl;

  const loadedTextures = [];
  for (const texture of textures) {
    const glTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, glTex);

    const source = images[texture.source]!;
    if (!source.uri && !source.bufferView) {
      throw new Error("image must specify a uri or bufferView");
    }
    const image = source.uri
      ? await loadImage(source.uri)
      : await (async () => {
          const bufferView = bufferViews[source.bufferView!]!;
          const buffer = buffers[bufferView.buffer]!;
          return await loadImage(buffer.uri, bufferView.byteOffset, bufferView.byteLength);
        })();

    // load image into gl
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);

    const sampler =
      texture.sampler !== undefined
        ? samplers[texture.sampler]!
        : {
            magFilter: gl.LINEAR,
            minFilter: gl.LINEAR,
            wrapS: gl.REPEAT,
            wrapT: gl.REPEAT,
          };

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, sampler.wrapS ?? gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, sampler.wrapT ?? gl.REPEAT);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, sampler.minFilter ?? gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, sampler.magFilter ?? gl.LINEAR);

    loadedTextures.push(glTex);
  }

  return loadedTextures;
}
