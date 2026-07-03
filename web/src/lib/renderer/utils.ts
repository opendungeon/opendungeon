import { ByteSize } from "./consts";

export function sizeof(gl: WebGLRenderingContext, type: number): ByteSize {
  switch (type) {
    case gl.FLOAT:
      return ByteSize.Float;
    case gl.INT:
      return ByteSize.Int;
    case gl.UNSIGNED_INT:
      return ByteSize.Uint;
    case gl.SHORT:
      return ByteSize.Short;
    case gl.UNSIGNED_SHORT:
      return ByteSize.Ushort;
    case gl.BYTE:
      return ByteSize.Byte;
    case gl.UNSIGNED_BYTE:
      return ByteSize.Ubyte;
    default:
      throw new Error(`unsupported attribute type: ${type}`);
  }
}
