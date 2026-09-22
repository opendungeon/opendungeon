import { FLOAT_BYTE_SIZE, MAT4_FLOAT_SIZE, TRS_SIZE, VEC4_FLOAT_SIZE } from "$lib/renderer/consts";
import Shader from "$lib/renderer/shader";
import * as GLM from "gl-matrix";
import {
  type GLTFBufferView,
  type GLTFImage,
  type GLTFMesh,
  GLTFPrimitiveMode,
  type GLTFSampler,
  type GLTFTexture,
  type GLTFAccessor,
  type GLTFMeshAttribute,
  type GLTFObject,
  type GLTFVec4,
  GLTFViewTarget,
  type GLTFVec3,
  GLTFComponentType,
  type GLTFAnimation,
  type Animation,
  type Material,
  type Mesh,
  type Node,
  type Primitive,
  type Skin,
} from "$lib/renderer/model/types";
import {
  getAccessorByteLength,
  getAttributeInfo,
  getAttributeName,
  loadImage,
  loadImageBuffer,
  uriToBuffer,
} from "$lib/renderer/model/utils";
import dynamicVertexTemplate from "$lib/assets/shaders/dynamic.tmpl.vert?raw";
import dynamicFragmentTemplate from "$lib/assets/shaders/dynamic.tmpl.frag?raw";
import staticVertexTemplate from "$lib/assets/shaders/static.tmpl.vert?raw";
import staticFragmentTemplate from "$lib/assets/shaders/static.tmpl.frag?raw";
import Template from "$lib/template";
import assert from "$lib/assert";
import DynamicModel from "$lib/renderer/model/dynamic";
import { IDENTITY_MAT4, WHITE } from "$lib/renderer/model/consts";
import StaticModel from "$lib/renderer/model/static";

export async function loadGLTF(
  gl: WebGL2RenderingContext,
  source: GLTFObject,
  preloadedBuffers?: Uint8Array<ArrayBuffer>[],
): Promise<DynamicModel> {
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

  const loadedBuffers =
    preloadedBuffers ??
    (await Promise.all(
      buffers.map(async ({ uri }) => {
        assert(uri !== undefined, "missing required uri");
        return uriToBuffer(uri!);
      }),
    ));

  const loadedMaterials = materials?.map<Material>((material) => ({
    name: material.name,
    baseColorFactor: material.pbrMetallicRoughness?.baseColorFactor ?? WHITE,
    baseColorTexture: material.pbrMetallicRoughness?.baseColorTexture?.index,
    alphaMode: material.alphaMode ?? "OPAQUE",
    alphaCutoff: material.alphaCutoff ?? 0.5,
    doubleSided: material.doubleSided ?? false,
  }));

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
      { texCoords: new Set<string>(), joints: new Set<string>(), weights: new Set<string>() },
    );
  const jointMatrixSize = Math.max(0, ...(skins ?? []).map((s) => s.joints.length));

  const maxUniformMatrixSize = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS) / 4;
  assert(
    jointMatrixSize <= maxUniformMatrixSize,
    "model contains more joints that hardware supports",
  );

  const shader = buildDynamicShader(gl, texCoords, weights, joints, jointMatrixSize);

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
    : await loadTextures(shader, textures, images, loadedBuffers, bufferViews, samplers);

  const defaultScene = scenes[scene];
  assert(!!defaultScene, "default scene is required");

  const trsTransforms = new Float32Array(TRS_SIZE * nodes.length);
  const loadedNodes: Node[] = [];
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

  const loadedSkins: Skin[] = [];
  for (const skin of skins ?? []) {
    const accessor = accessors[skin.inverseBindMatrices];
    const bufferView = bufferViews[accessor.bufferView];
    const buffer = loadedBuffers[bufferView.buffer];
    const byteOffset = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    const slice = buffer.slice(byteOffset, byteOffset + 64 * accessor.count);
    const inverseBindMatrices = new Float32Array(slice.buffer);
    loadedSkins.push({ inverseBindMatrices, joints: skin.joints });
  }

  const loadedAnimations = loadAnimations(accessors, animations ?? [], bufferViews, loadedBuffers);

  return new DynamicModel(
    shader,
    loadedAnimations,
    glBuffers,
    loadedMaterials ?? [],
    loadedMeshes,
    loadedTextures,
    loadedNodes,
    defaultScene.nodes,
    loadedSkins,
    trsTransforms,
  );
}

export async function loadStaticGLTF(
  gl: WebGL2RenderingContext,
  source: GLTFObject,
  preloadedBuffers?: Uint8Array<ArrayBuffer>[],
): Promise<StaticModel> {
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
    textures,
  } = source;

  const loadedBuffers =
    preloadedBuffers ??
    (await Promise.all(
      buffers.map(async ({ uri }) => {
        assert(uri !== undefined, "missing required uri");
        return uriToBuffer(uri!);
      }),
    ));

  const loadedMaterials = materials?.map<Material>((material) => ({
    name: material.name,
    baseColorFactor: material.pbrMetallicRoughness?.baseColorFactor ?? WHITE,
    baseColorTexture: material.pbrMetallicRoughness?.baseColorTexture?.index,
    alphaMode: material.alphaMode ?? "OPAQUE",
    alphaCutoff: material.alphaCutoff ?? 0.5,
    doubleSided: material.doubleSided ?? false,
  }));

  const texCoords = meshes
    .flatMap(({ primitives }) => primitives)
    .reduce((acc, curr) => {
      for (const attribute of Object.keys(curr.attributes)) {
        const name = getAttributeName(attribute as GLTFMeshAttribute);
        assert(!!name, `received unknown attribute ${attribute}`);

        if (attribute.startsWith("TEXCOORD")) {
          acc.add(name!);
        }
      }
      return acc;
    }, new Set<string>());

  const shader = buildStaticShader(gl, texCoords);

  gl.bindVertexArray(null);

  const instanceBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, IDENTITY_MAT4, gl.DYNAMIC_DRAW);

  const instanceLocation = gl.getAttribLocation(shader.program, "a_root_transform");
  assert(instanceLocation !== -1, "a_root_transform attribute not found");

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
    : await loadTextures(shader, textures, images, loadedBuffers, bufferViews, samplers);

  console.log(`loadedTextures.length: ${loadedTextures.length}`);

  const defaultScene = scenes[scene];
  assert(!!defaultScene, "default scene is required");

  const transforms = new Float32Array(MAT4_FLOAT_SIZE * nodes.length);
  const loadedNodes: Node[] = [];
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

    // calculate and store the local transform
    const offset = i * MAT4_FLOAT_SIZE;
    const transform = node.matrix
      ? GLM.mat4.fromValues(...node.matrix)
      : (() => {
          const translation = !node.translation
            ? GLM.vec3.fromValues(0, 0, 0)
            : GLM.vec3.fromValues(...node.translation);
          const rotation = !node.rotation
            ? GLM.vec4.fromValues(0, 0, 0, 1)
            : GLM.vec4.fromValues(...node.rotation);
          const scale = !node.scale
            ? GLM.vec3.fromValues(1, 1, 1)
            : GLM.vec3.fromValues(...node.scale);

          const matrix = GLM.mat4.create();
          GLM.mat4.fromRotationTranslationScale(matrix, rotation, translation, scale);

          return matrix;
        })();
    transforms.set(transform, offset);

    loadedNodes.push({
      mesh: node.mesh,
      globalTransform: i,
      skin: node.skin,
      children: node.children ?? [],
      trsOffset: offset,
    });
  }

  // dfs scene graph to generate transforms
  for (const root of defaultScene.nodes) {
    const stack: Array<{ nodeIndex: number; parentGlobal: GLM.mat4 }> = [
      { nodeIndex: root, parentGlobal: GLM.mat4.create() },
    ];

    while (stack.length > 0) {
      const { nodeIndex, parentGlobal } = stack.pop()!;
      const node = loadedNodes[nodeIndex]!;

      // convert the stored local transform into a global transform
      const offset = nodeIndex * MAT4_FLOAT_SIZE;
      const localTransform = transforms.subarray(offset, offset + MAT4_FLOAT_SIZE);
      const globalTransform = GLM.mat4.create();
      GLM.mat4.mul(globalTransform, parentGlobal, localTransform);
      transforms.set(globalTransform, nodeIndex * MAT4_FLOAT_SIZE);

      for (const child of node.children ?? []) {
        stack.push({ nodeIndex: child, parentGlobal: globalTransform });
      }
    }
  }

  return new StaticModel(
    shader,
    glBuffers,
    loadedMaterials ?? [],
    loadedMeshes,
    loadedTextures,
    loadedNodes,
    transforms,
    instanceBuffer,
  );
}

function buildDynamicShader(
  gl: WebGL2RenderingContext,
  texCoords: Set<string>,
  weights: Set<string>,
  joints: Set<string>,
  jointMatrixSize: number,
): Shader {
  const textured = texCoords.size >= 1;
  const jointed = joints.size >= 1;

  const vertexShader = new Template(dynamicVertexTemplate).build({
    texCoordCount: texCoords.size,
    jointCount: joints.size,
    weightCount: weights.size,
    jointed,
    jointMatrixSize,
  });
  const fragmentShader = new Template(dynamicFragmentTemplate).build({
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

  return shader;
}

function buildStaticShader(gl: WebGL2RenderingContext, texCoords: Set<string>): Shader {
  const textured = texCoords.size >= 1;

  const vertexShader = new Template(staticVertexTemplate).build({ texCoordCount: texCoords.size });
  const fragmentShader = new Template(staticFragmentTemplate).build({
    texCoordCount: texCoords.size,
    textured,
  });

  const shader = new Shader(gl, vertexShader, fragmentShader);
  shader.loadUniformLocation("u_node_transform");
  shader.loadUniformLocation("u_view");
  shader.loadUniformLocation("u_projection");

  if (textured) {
    shader.loadUniformLocation("u_has_texture");
    shader.loadUniformLocation("u_texture");
  }
  shader.loadUniformLocation("u_base_color");
  shader.loadUniformLocation("u_alpha_cutoff");

  return shader;
}

function loadMeshes(
  shader: Shader,
  accessors: GLTFAccessor[],
  meshes: GLTFMesh[],
  buffers: WebGLBuffer[],
  bufferViews: GLTFBufferView[],
  instanceLocation?: number,
  instanceBuffer?: WebGLBuffer,
): Mesh[] {
  const gl = shader.gl;
  return meshes.map<Mesh>(({ primitives }) => {
    const loadedPrimitives = primitives.map<Primitive>(
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

        if (instanceLocation !== undefined) {
          assert(!!instanceBuffer, "instanceBuffer required when passing instanceLocation");

          gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer!);
          const instanceStride = MAT4_FLOAT_SIZE * FLOAT_BYTE_SIZE;
          const columnStride = VEC4_FLOAT_SIZE * FLOAT_BYTE_SIZE;
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
        }

        return {
          vertexArray: vao,
          drawMode: mode ?? GLTFPrimitiveMode.Triangles,
          indices: {
            count: indicesAccessor.count,
            componentType: indicesAccessor.componentType,
            byteOffset: indicesAccessor.byteOffset,
          },
          material,
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
  buffers: Uint8Array<ArrayBuffer>[],
  bufferViews: GLTFBufferView[],
  samplers: GLTFSampler[],
): Promise<WebGLTexture[]> {
  const gl = shader.gl;

  const loadedTextures = [];
  for (const texture of textures) {
    const glTex = gl.createTexture();

    const source = images[texture.source]!;
    if (!source.uri && !source.bufferView) {
      throw new Error("image must specify a uri or bufferView");
    }
    const image = source.uri
      ? await loadImage(source.uri)
      : await (async () => {
          const bufferView = bufferViews[source.bufferView!]!;
          const buffer = buffers[bufferView.buffer]!;
          const offset = bufferView.byteOffset ?? 0;
          const slice = buffer.subarray(offset, offset + bufferView.byteLength);
          return await loadImageBuffer(slice, source.mimeType ?? "image/jpeg");
        })();

    // load image into gl
    gl.bindTexture(gl.TEXTURE_2D, glTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    const err = gl.getError();
    console.error(`err: ${err}`);

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

function loadAnimations(
  accessors: GLTFAccessor[],
  animations: GLTFAnimation[],
  bufferViews: GLTFBufferView[],
  loadedBuffers: Uint8Array[],
): Record<string, Animation> {
  const loadedAnimations: Record<string, Animation> = {};
  for (const [i, animation] of (animations ?? []).entries()) {
    const channels: Animation["channels"] = [];
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

  return loadedAnimations;
}
