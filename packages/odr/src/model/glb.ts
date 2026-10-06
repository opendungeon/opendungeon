import { UNSIGNED_INT_BYTE_SIZE } from "../consts.js";
import type { GLTFObject } from "./types.js";
import { buildGLTFDynamicShader, buildGLTFStaticShader, getGLTFModelParams } from "./gltf.js";
import DynamicModel from "./dynamic.js";
import StaticModel from "./static.js";
import { error, ok, type Result } from "result";

const MAGIC = 0x46546c67;
const HEADER_SIZE = 3 * UNSIGNED_INT_BYTE_SIZE;
const JSON_HEX = 0x4e4f534a;
const BIN_HEX = 0x004e4942;

export async function loadGLB(
  gl: WebGL2RenderingContext,
  blob: Blob,
): Promise<Result<DynamicModel, string>> {
  const buffer = await blob.arrayBuffer();
  const chunks = getGLBChunks(buffer);
  if (!chunks.ok) {
    return chunks;
  }
  const { source, data } = chunks.value;

  const shader = buildGLTFDynamicShader(gl, source.meshes, source.skins ?? []);
  if (!shader.ok) {
    return shader;
  }

  const params = await getGLTFModelParams(shader.value, source, { preloadedBuffers: [data] });
  if (!params.ok) {
    return params;
  }

  return ok(new DynamicModel(params.value));
}

export async function loadStaticGLB(
  gl: WebGL2RenderingContext,
  blob: Blob,
): Promise<Result<StaticModel, string>> {
  const buffer = await blob.arrayBuffer();
  const chunks = getGLBChunks(buffer);
  if (!chunks.ok) {
    return chunks;
  }
  const { source, data } = chunks.value;

  const shader = buildGLTFStaticShader(gl, source.meshes);
  if (!shader.ok) {
    return shader;
  }

  const params = await getGLTFModelParams(shader.value, source, {
    instanced: true,
    preloadedBuffers: [data],
  });
  if (!params.ok) {
    return params;
  }

  return ok(new StaticModel(params.value));
}

export function getGLBChunks(buffer: ArrayBuffer): Result<
  {
    source: GLTFObject;
    data: Uint8Array<ArrayBuffer>;
  },
  string
> {
  const view = new DataView(buffer);

  const magic = view.getUint32(0, true);
  if (magic !== MAGIC) {
    return error("GLB contains an invalid magic number.");
  }

  const chunk0Offset = HEADER_SIZE;
  const chunk0Length = view.getUint32(chunk0Offset, true);
  const chunk0Type = view.getUint32(chunk0Offset + UNSIGNED_INT_BYTE_SIZE, true);
  if (chunk0Type !== JSON_HEX) {
    return error("Chunk is of an invalid type.");
  }

  const chunk0DataOffset = chunk0Offset + 2 * UNSIGNED_INT_BYTE_SIZE;
  const chunk0Data = new Uint8Array(buffer).subarray(
    chunk0DataOffset,
    chunk0DataOffset + chunk0Length,
  );

  const decoder = new TextDecoder("utf-8");
  const raw = decoder.decode(chunk0Data);
  const source: GLTFObject = JSON.parse(raw);

  const chunk1Offset = chunk0Offset + 2 * UNSIGNED_INT_BYTE_SIZE + chunk0Length;
  const chunk1Length = view.getUint32(chunk1Offset, true);
  const chunk1Type = view.getUint32(chunk1Offset + UNSIGNED_INT_BYTE_SIZE, true);
  if (chunk1Type !== BIN_HEX) {
    return error("Chunk is of an invalid type.");
  }

  const chunk1DataOffset = chunk1Offset + 2 * UNSIGNED_INT_BYTE_SIZE;
  const data = new Uint8Array(buffer).subarray(chunk1DataOffset, chunk1DataOffset + chunk1Length);

  return ok({ source, data });
}
