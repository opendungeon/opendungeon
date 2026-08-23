import {
  type GLTFAccessor,
  GLTFComponentType,
  type GLTFMeshAttribute,
  type GLTFType,
} from "./types";
import type { VertexAttribute } from "../element";
import { VEC2_FLOAT_SIZE, VEC3_FLOAT_SIZE, VEC4_FLOAT_SIZE } from "../consts";

export function getAttributeName(attribute: GLTFMeshAttribute): string | null {
  if (attribute === "POSITION") {
    return "a_position";
  }

  if (attribute === "NORMAL") {
    return "a_normal";
  }

  if (attribute === "TANGENT") {
    return "a_tangent";
  }

  if (attribute.startsWith("TEXCOORD")) {
    const n = Number(attribute.slice("TEXCOORD_".length));
    if (isNaN(n) || n < 0) {
      throw new Error(`invalid texcoord attribute: ${attribute}`);
    }

    return `a_texture_coord_${n}`;
  }

  if (attribute.startsWith("JOINTS")) {
    const n = Number(attribute.slice("JOINTS_".length));
    if (isNaN(n) || n < 0) {
      throw new Error(`invalid joints attribute: ${attribute}`);
    }

    if (n !== 0) {
      throw new Error("Only joint 0 is supported.");
    }

    return `a_joint_${n}`;
  }

  if (attribute.startsWith("WEIGHTS")) {
    const n = Number(attribute.slice("WEIGHTS_".length));
    if (isNaN(n) || n < 0) {
      throw new Error(`invalid weights attribute: ${attribute}`);
    }

    if (n !== 0) {
      throw new Error("Only weight 0 is supported.");
    }

    return `a_weight_${n}`;
  }

  return null;
}

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

  if (attribute.startsWith("JOINTS")) {
    const n = Number(attribute.slice("JOINTS_".length));
    if (isNaN(n) || n < 0) {
      throw new Error(`invalid joints attribute: ${attribute}`);
    }

    if (n !== 0) {
      throw new Error("Only joint 0 is supported.");
    }

    return {
      name: `a_joint_${n}`,
      size: VEC4_FLOAT_SIZE,
      type: gl.UNSIGNED_SHORT, // TODO: this should not be hardcoded. instead, look at the accessor's type
      normalized: false,
    };
  }

  if (attribute.startsWith("WEIGHTS")) {
    const n = Number(attribute.slice("WEIGHTS_".length));
    if (isNaN(n) || n < 0) {
      throw new Error(`invalid weights attribute: ${attribute}`);
    }

    if (n !== 0) {
      throw new Error("Only weight 0 is supported.");
    }

    return {
      name: `a_weight_${n}`,
      size: VEC4_FLOAT_SIZE,
      type: gl.FLOAT, // TODO: this should not be hardcoded. instead, look at the accessor's type
      normalized: false,
    };
  }

  return null;
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

export function sizeOfComponent(component: GLTFComponentType): number {
  switch (component) {
    case GLTFComponentType.SignedByte:
      return 1;
    case GLTFComponentType.UnsignedByte:
      return 1;
    case GLTFComponentType.SignedShort:
      return 2;
    case GLTFComponentType.UnsignedShort:
      return 2;
    case GLTFComponentType.UnsignedInt:
      return 4;
    case GLTFComponentType.Float:
      return 4;
  }
}

export function sizeOfType(type: GLTFType): number {
  switch (type) {
    case "SCALAR":
      return 1;
    case "VEC2":
      return 2;
    case "VEC3":
      return 3;
    case "VEC4":
      return 4;
    case "MAT2":
      return 4;
    case "MAT3":
      return 9;
    case "MAT4":
      return 16;
  }
}

export function getAccessorByteLength(accessor: GLTFAccessor) {
  return accessor.count * sizeOfType(accessor.type) * sizeOfComponent(accessor.componentType);
}

export function clamp(n: number, min: number, max: number): number {
  if (n > max) {
    return max;
  } else if (n < min) {
    return min;
  }
  return n;
}
