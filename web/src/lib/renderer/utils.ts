import {
  BYTE_SIZE,
  FLOAT_BYTE_SIZE,
  INT_BYTE_SIZE,
  SHORT_BYTE_SIZE,
  UNSIGNED_BYTE_SIZE,
  UNSIGNED_INT_BTYE_SIZE,
  UNSIGNED_SHORT_BYTE_SIZE,
} from "./consts";

export function sizeof(gl: WebGLRenderingContext, type: number): number {
  switch (type) {
    case gl.FLOAT:
      return FLOAT_BYTE_SIZE;
    case gl.INT:
      return INT_BYTE_SIZE;
    case gl.UNSIGNED_INT:
      return UNSIGNED_INT_BTYE_SIZE;
    case gl.SHORT:
      return SHORT_BYTE_SIZE;
    case gl.UNSIGNED_SHORT:
      return UNSIGNED_SHORT_BYTE_SIZE;
    case gl.BYTE:
      return BYTE_SIZE;
    case gl.UNSIGNED_BYTE:
      return UNSIGNED_BYTE_SIZE;
    default:
      throw new Error(`unsupported attribute type: ${type}`);
  }
}
