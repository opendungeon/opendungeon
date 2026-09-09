import assert from "$lib/assert";
import { UNSIGNED_INT_BYTE_SIZE } from "$lib/renderer/consts";
import type { GLTFObject } from "$lib/renderer/model/types";
import { loadGLTF } from "$lib/renderer/model/gltf";

const MAGIC = 0x46546c67;
const HEADER_SIZE = 3 * UNSIGNED_INT_BYTE_SIZE;
const JSON_HEX = 0x4e4f534a;
const BIN_HEX = 0x004e4942;

export async function loadGLB(gl: WebGL2RenderingContext, blob: Blob) {
  const buffer = await blob.arrayBuffer();
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
  const source = decoder.decode(chunk0Data);
  const gltf: GLTFObject = JSON.parse(source);

  const chunk1Offset = chunk0Offset + 2 * UNSIGNED_INT_BYTE_SIZE + chunk0Length;
  const chunk1Length = view.getUint32(chunk1Offset, true);
  const chunk1Type = view.getUint32(chunk1Offset + UNSIGNED_INT_BYTE_SIZE, true);
  assert(chunk1Type === BIN_HEX, "invalid chunk 1");

  const chunk1DataOffset = chunk1Offset + 2 * UNSIGNED_INT_BYTE_SIZE;
  const chunk1Data = new Uint8Array(buffer).subarray(
    chunk1DataOffset,
    chunk1DataOffset + chunk1Length,
  );

  // glb is just a glTF with a preloaded buffer
  return await loadGLTF(gl, gltf, [chunk1Data]);
}
