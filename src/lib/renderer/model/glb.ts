import assert from "$lib/assert";
import { UNSIGNED_INT_BYTE_SIZE } from "$lib/renderer/consts";
import type { GLTFObject } from "$lib/renderer/model/types";
import {
  buildGLTFDynamicShader,
  buildGLTFStaticShader,
  getGLTFModelParams,
} from "$lib/renderer/model/gltf";
import DynamicModel from "$lib/renderer/model/dynamic";
import StaticModel from "$lib/renderer/model/static";

const MAGIC = 0x46546c67;
const HEADER_SIZE = 3 * UNSIGNED_INT_BYTE_SIZE;
const JSON_HEX = 0x4e4f534a;
const BIN_HEX = 0x004e4942;

export async function loadGLB(gl: WebGL2RenderingContext, blob: Blob): Promise<DynamicModel> {
  const buffer = await blob.arrayBuffer();
  const { source, data } = getGLBChunks(buffer);
  const shader = buildGLTFDynamicShader(gl, source.meshes, source.skins ?? []);
  const params = await getGLTFModelParams(shader, source, { preloadedBuffers: [data] });
  return new DynamicModel(params);
}

export async function loadStaticGLB(gl: WebGL2RenderingContext, blob: Blob): Promise<StaticModel> {
  const buffer = await blob.arrayBuffer();
  const { source, data } = getGLBChunks(buffer);
  const shader = buildGLTFStaticShader(gl, source.meshes);
  const params = await getGLTFModelParams(shader, source, {
    instanced: true,
    preloadedBuffers: [data],
  });
  return new StaticModel(params);
}

export function getGLBChunks(buffer: ArrayBuffer): {
  source: GLTFObject;
  data: Uint8Array<ArrayBuffer>;
} {
  const view = new DataView(buffer);

  const magic = view.getUint32(0, true);
  assert(magic === MAGIC, `invalid glb magic, received ${magic}`);

  const chunk0Offset = HEADER_SIZE;
  const chunk0Length = view.getUint32(chunk0Offset, true);
  const chunk0Type = view.getUint32(chunk0Offset + UNSIGNED_INT_BYTE_SIZE, true);
  assert(chunk0Type === JSON_HEX, "invalid chunk 0");

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
  assert(chunk1Type === BIN_HEX, "invalid chunk 1");

  const chunk1DataOffset = chunk1Offset + 2 * UNSIGNED_INT_BYTE_SIZE;
  const data = new Uint8Array(buffer).subarray(chunk1DataOffset, chunk1DataOffset + chunk1Length);

  return { source, data };
}
