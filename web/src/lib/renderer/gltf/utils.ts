import type { GLTFMeshAttribute, GLTFNode } from "./types";
import type { VertexAttribute } from "../element";
import { VEC2_FLOAT_SIZE, VEC3_FLOAT_SIZE, VEC4_FLOAT_SIZE } from "../consts";
import * as GLM from "gl-matrix";

export function getAttributeInfo(
  gl: WebGL2RenderingContext,
  attribute: GLTFMeshAttribute,
): Omit<VertexAttribute, "byteOffset"> | null {
  if (attribute === "POSITION") {
    return {
      name: "a_position",
      size: VEC3_FLOAT_SIZE,
      type: gl.FLOAT,
      normalized: false,
    };
  }

  if (attribute === "NORMAL") {
    return {
      name: "a_normal",
      size: VEC3_FLOAT_SIZE,
      type: gl.FLOAT,
      normalized: true,
    };
  }

  if (attribute === "TANGENT") {
    return {
      name: "a_tangent",
      size: VEC4_FLOAT_SIZE,
      type: gl.FLOAT,
      normalized: true,
    };
  }

  if (attribute.startsWith("TEXCOORD")) {
    const n = Number(attribute.slice("TEXCOORD_".length));
    if (isNaN(n) || n < 0) {
      throw new Error(`invalid texcoord attribute: ${attribute}`);
    }

    if (n > 1) {
      throw new Error("Only UV 0 and 1 are supported.");
    }

    return {
      name: `a_texture_coord_${n}`,
      size: VEC2_FLOAT_SIZE,
      type: gl.FLOAT,
      normalized: false,
    };
  }

  return null;
}

export function getNodeTransform(node: GLTFNode): GLM.mat4 {
  const transform = GLM.mat4.create();
  if (node.matrix) {
    GLM.mat4.mul(transform, transform, node.matrix);
  } else {
    if (node.translation) {
      GLM.mat4.translate(transform, transform, node.translation);
    }

    if (node.rotation) {
      const rot = GLM.mat4.create();
      GLM.mat4.fromQuat(rot, node.rotation);
      GLM.mat4.mul(transform, transform, rot);
    }

    if (node.scale) {
      GLM.mat4.scale(transform, transform, node.scale);
    }
  }

  return transform;
}

export async function uriToBuffer(uri: string): Promise<Uint8Array> {
  return uri.startsWith("data:")
    ? Uint8Array.fromBase64(uri.split(",").slice(1).join(""))
    : await fetch(uri).then(async (res) =>
        !res.ok ? Promise.reject() : new Uint8Array(await res.arrayBuffer()),
      );
}

export async function uriToBlob(uri: string, offset?: number, length?: number): Promise<Blob> {
  if (!uri.startsWith("data:")) {
    return await fetch(uri)
      .then((res) => (!res.ok ? Promise.reject() : res.blob()))
      .then((blob) => blob.slice(offset ?? 0, (offset ?? 0) + (length ?? blob.size)));
  }

  const parts = uri.split(";");
  if (parts.length < 2) {
    throw new Error("invalid data uri: header and body required");
  }

  const header = parts[0]!;
  const body = parts.at(-1)!;
  const [, type] = header.split("data:");
  const [format, data] = body.split(",");
  if (!data) {
    throw new Error("invalid data uri: missing data");
  }

  switch (format) {
    case "base64": {
      const buffer = Uint8Array.fromBase64(data);
      const blob = new Blob(
        [buffer.subarray(offset ?? 0, (offset ?? 0) + (length ?? buffer.length))],
        { type },
      );
      return blob;
    }
    default:
      throw new Error(`unsupported data format: ${format}`);
  }
}

export async function loadImage(
  uri: string,
  offset?: number,
  length?: number,
): Promise<HTMLImageElement> {
  const image = new Image();
  const blob = await uriToBlob(uri, offset, length);
  const load = new Promise((res, rej) => {
    image.onload = res;
    image.onerror = rej;
  });

  image.src = URL.createObjectURL(blob);
  await load;

  URL.revokeObjectURL(image.src);
  return image;
}
