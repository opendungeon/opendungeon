import {
  BYTE_SIZE,
  FLOAT_BYTE_SIZE,
  INT_BYTE_SIZE,
  SHORT_BYTE_SIZE,
  UNSIGNED_BYTE_SIZE,
  UNSIGNED_INT_BTYE_SIZE,
  UNSIGNED_SHORT_BYTE_SIZE,
} from "$lib/renderer/consts";

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

export type Batch = {
  texture: string;
  offset: number;
  count: number;
};

export function batchByTexture<T extends { texture: string }>(instances: T[]): Batch[] {
  const textureCounts = instances.reduce((map, instance) => {
    const count = map.get(instance.texture) ?? 0;
    return map.set(instance.texture, count + 1);
  }, new Map<string, number>());

  const { batches } = Array.from(textureCounts.entries()).reduce<{
    totalOffset: number;
    batches: Batch[];
  }>(
    ({ totalOffset, batches }, [texture, count]) => {
      return {
        totalOffset: totalOffset + count,
        batches: [...batches, { texture, count, offset: totalOffset }],
      };
    },
    { totalOffset: 0, batches: [] },
  );

  return batches;
}
