import assert from "$lib/assert";
import { UNSIGNED_INT_BTYE_SIZE } from "$lib/renderer/consts";
import type { GLTFObject } from "./types";

const MAGIC = 0x676c5446;
const HEADER_SIZE = 3 * UNSIGNED_INT_BTYE_SIZE;
const JSON_HEX = 0x4a534f4e;

export async function importGLB(blob: Blob) {
  const buffer = await blob.arrayBuffer();
  const view = new DataView(buffer);

  const magic = view.getUint32(0, true);
  assert(magic === MAGIC, "invalid glb magic");

  const chunk0Length = view.getUint32(HEADER_SIZE);
  const chunk0Type = view.getUint32(HEADER_SIZE + UNSIGNED_INT_BTYE_SIZE);
  assert(chunk0Type === JSON_HEX, "invalid chunk 0");

  const chunk0Offset = HEADER_SIZE + 2 * UNSIGNED_INT_BTYE_SIZE;
  const chunk0Data = new Uint8Array(buffer).subarray(chunk0Offset, chunk0Offset + chunk0Length);

  const decoder = new TextDecoder("utf-8");
  const gltf: GLTFObject = JSON.parse(decoder.decode(chunk0Data));
}
