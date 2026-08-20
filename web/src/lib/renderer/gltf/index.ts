import { type Camera } from "../camera";
import ArenaAllocator from "../arena";
import { FLOAT_BYTE_SIZE, MAT4_FLOAT_SIZE, VEC4_FLOAT_SIZE } from "../consts";
import type { RenderElement } from "../element";
import Shader from "../shader";
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
} from "./types";
import { getAttributeInfo, loadImage, uriToBuffer } from "./utils";
import vertexShader from "$lib/assets/shaders/gltf.vert?raw";
import fragmentShader from "$lib/assets/shaders/gltf.frag?raw";

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
  translation: GLM.vec3;
  rotation: GLM.vec4;
  scale: GLM.vec3;
  children: number[];
  mesh?: number;
  skin?: number;
};

type LoadedSkin = {
  inverseBindMatrices: Float32Array;
  joints: number[];
};

const IDENTITY_MAT4 = new Float32Array(GLM.mat4.create());

export default class GLTF implements RenderElement {
  private shader: Shader;

  private accessors: GLTFAccessor[];
  private buffers: WebGLBuffer[];
  private materials: GLTFMaterial[];
  private meshes: LoadedMesh[];
  nodes: LoadedNode[];
  private scene: GLTFScene;
  private skins: LoadedSkin[];
  private textures: WebGLTexture[];

  private instanceBuffer: WebGLBuffer;
  private instanceArena: ArenaAllocator;

  private transforms: Float32Array;

  private constructor(
    shader: Shader,
    accessors: GLTFAccessor[],
    buffers: WebGLBuffer[],
    materials: GLTFMaterial[],
    meshes: LoadedMesh[],
    textures: WebGLTexture[],
    instanceBuffer: WebGLBuffer,
    nodes: LoadedNode[],
    scene: GLTFScene,
    skins: LoadedSkin[],
    transforms: Float32Array,
  ) {
    this.shader = shader;
    this.accessors = accessors;
    this.buffers = buffers;
    this.materials = materials;
    this.meshes = meshes;
    this.nodes = nodes;
    this.textures = textures;
    this.instanceBuffer = instanceBuffer;
    this.instanceArena = new ArenaAllocator(MAT4_FLOAT_SIZE, 1);
    this.scene = scene;
    this.skins = skins;
    this.transforms = transforms;
  }

  static async fromSource(gl: WebGL2RenderingContext, source: GLTFObject): Promise<GLTF> {
    const {
      accessors,
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

    const shader = new Shader(gl, vertexShader, fragmentShader);
    shader.loadUniformLocation("u_node_transform");
    shader.loadUniformLocation("u_view");
    shader.loadUniformLocation("u_projection");
    shader.loadUniformLocation("u_has_texture");
    shader.loadUniformLocation("u_texture");
    shader.loadUniformLocation("u_texture_coord");
    shader.loadUniformLocation("u_base_color");
    shader.loadUniformLocation("u_alpha_cutoff");
    shader.loadUniformLocation("u_joint_matrix[0]");

    // shared instance buffer (per-instance root transforms, mat4 each)
    const instanceBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
    // default to a single identity instance so callers that never call
    // loadInstanceBuffer still see one copy of the model.
    gl.bufferData(gl.ARRAY_BUFFER, IDENTITY_MAT4, gl.DYNAMIC_DRAW);

    const instanceLocation = gl.getAttribLocation(shader.program, "a_root_transform");
    if (instanceLocation === -1) {
      throw new Error(`missing attribute "a_root_transform"`);
    }

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
    const loadedMeshes = loadMeshes(
      shader,
      accessors,
      meshes,
      glBuffers,
      bufferViews,
      instanceLocation,
      instanceBuffer,
    );

    // load textures
    const loadedTextures = !textures
      ? []
      : await loadTextures(shader, textures, images, buffers, bufferViews, samplers);

    const defaultScene = scenes[scene];
    if (!defaultScene) {
      throw new Error("default scene is required");
    }

    const transforms = new Float32Array(MAT4_FLOAT_SIZE * nodes.length);
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
        node.scale = rotation as GLTFVec3;
      }

      loadedNodes.push({
        mesh: node.mesh,
        globalTransform: i,
        skin: node.skin,
        children: node.children ?? [],
        translation: !node.translation
          ? GLM.vec3.fromValues(0, 0, 0)
          : GLM.vec3.fromValues(...node.translation),
        rotation: !node.rotation
          ? GLM.vec4.fromValues(0, 0, 0, 1)
          : GLM.vec4.fromValues(...node.rotation),
        scale: !node.scale ? GLM.vec3.fromValues(1, 1, 1) : GLM.vec3.fromValues(...node.scale),
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

    return new GLTF(
      shader,
      accessors,
      glBuffers,
      materials ?? [],
      loadedMeshes,
      loadedTextures,
      instanceBuffer,
      loadedNodes,
      defaultScene,
      loadedSkins,
      transforms,
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
    for (const node of this.nodes) {
      this.drawNode(node, count, (mode) => mode !== "BLEND");
    }

    // Pass 2: blended (read depth but don't write, blend enabled).
    gl.enable(gl.BLEND);
    gl.depthMask(false);
    for (const node of this.nodes) {
      this.drawNode(node, count, (mode) => mode === "BLEND");
    }

    // restore defaults for the rest of the frame
    gl.depthMask(true);
    gl.enable(gl.BLEND);
    gl.enable(gl.CULL_FACE);

    // unbind for a clean state
    gl.bindTexture(gl.TEXTURE_2D, null);

    this.instanceArena.reset();
  }

  // dfs scene graph to generate transforms
  updateTransforms() {
    for (const rootNode of this.scene.nodes) {
      const stack: Array<{ nodeIndex: number; parentGlobal: GLM.mat4 }> = [
        { nodeIndex: rootNode, parentGlobal: GLM.mat4.create() },
      ];

      while (stack.length > 0) {
        const { nodeIndex, parentGlobal } = stack.pop()!;
        const node = this.nodes[nodeIndex]!;

        const localTransform = GLM.mat4.create();
        GLM.mat4.fromRotationTranslationScale(
          localTransform,
          node.rotation,
          node.translation,
          node.scale,
        );
        const globalTransform = GLM.mat4.create();
        GLM.mat4.mul(globalTransform, parentGlobal, localTransform);
        this.transforms.set(globalTransform, nodeIndex * MAT4_FLOAT_SIZE);

        for (const child of node.children ?? []) {
          stack.push({ nodeIndex: child, parentGlobal: globalTransform });
        }
      }
    }
  }

  computeSkinningMatrix() {
    for (const node of this.nodes) {
      if (node.skin === undefined) {
        continue;
      }

      const skin = this.skins[node.skin];
      const jointMatrices = new Float32Array(MAT4_FLOAT_SIZE * skin.joints.length);

      for (let i = 0; i < skin.joints.length; i++) {
        const joint = skin.joints[i];
        const jointNode = this.nodes[joint];

        const globalJointTransform = this.transforms.subarray(
          jointNode.globalTransform * MAT4_FLOAT_SIZE,
          MAT4_FLOAT_SIZE * (jointNode.globalTransform + 1),
        ) as GLM.mat4;

        const globalMeshTransform = this.transforms.subarray(
          node.globalTransform * MAT4_FLOAT_SIZE,
          MAT4_FLOAT_SIZE * (node.globalTransform + 1),
        ) as GLM.mat4;
        const inverseGlobalMeshTransform = GLM.mat4.create();
        GLM.mat4.invert(inverseGlobalMeshTransform, globalMeshTransform);

        const inverseBindMatrix = skin.inverseBindMatrices.subarray(
          i * MAT4_FLOAT_SIZE,
          MAT4_FLOAT_SIZE * (i + 1),
        ) as GLM.mat4;

        const jointMatrix = GLM.mat4.create();
        GLM.mat4.mul(jointMatrix, inverseGlobalMeshTransform, globalJointTransform);
        GLM.mat4.mul(jointMatrix, jointMatrix, inverseBindMatrix);

        jointMatrices.set(jointMatrix, i * MAT4_FLOAT_SIZE);
      }

      this.setUniformMatrix4fv("u_joint_matrix[0]", jointMatrices);
    }
  }

  private drawNode(
    { mesh: meshIndex, globalTransform }: LoadedNode,
    count: number,
    accept: (alphaMode: GLTFAlphaMode) => boolean,
  ) {
    if (meshIndex === undefined) {
      return;
    }
    const mesh = this.meshes[meshIndex];

    const gl = this.shader.gl;
    let uniformSet = false;

    for (const { vertexArray, drawMode, material, indices: accessor } of mesh.primitives) {
      const mat = material === undefined ? DEFAULT_MATERIAL : this.materials[material]!;
      const alphaMode: GLTFAlphaMode = mat.alphaMode ?? "OPAQUE";
      if (!accept(alphaMode)) {
        continue;
      }

      if (!uniformSet) {
        const offset = globalTransform * MAT4_FLOAT_SIZE;
        const nodeTransform = this.transforms.subarray(offset, offset + MAT4_FLOAT_SIZE);
        this.setUniformMatrix4fv("u_node_transform", nodeTransform);
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
        this.setUniform1i("u_texture_coord", baseColorTexture.texCoord ?? 0);
        this.setUniform4fv("u_base_color", baseColorFactor ?? WHITE);
      } else if (baseColorFactor) {
        this.setUniform1i("u_texture_coord", 0);
        this.setUniform1i("u_has_texture", 0);
        this.setUniform4fv("u_base_color", baseColorFactor);
      } else {
        this.setUniform1i("u_texture_coord", 0);
        this.setUniform1i("u_has_texture", 0);
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

function loadMeshes(
  shader: Shader,
  accessors: GLTFAccessor[],
  meshes: GLTFMesh[],
  buffers: WebGLBuffer[],
  bufferViews: GLTFBufferView[],
  instanceLocation: number,
  instanceBuffer: WebGLBuffer,
): LoadedMesh[] {
  const gl = shader.gl;
  const instanceStride = MAT4_FLOAT_SIZE * FLOAT_BYTE_SIZE;
  const columnStride = VEC4_FLOAT_SIZE * FLOAT_BYTE_SIZE;

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

        // wire per-instance root transform (mat4 = 4 consecutive vec4 slots)
        gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
        for (let l = 0; l < 4; l++) {
          const loc = instanceLocation + l;
          gl.vertexAttribPointer(
            loc,
            VEC4_FLOAT_SIZE,
            gl.FLOAT,
            false,
            instanceStride,
            l * columnStride,
          );
          gl.enableVertexAttribArray(loc);
          gl.vertexAttribDivisor(loc, 1);
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
