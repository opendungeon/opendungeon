import * as GLM from "gl-matrix";
import type { Material } from "$lib/renderer/model/types";

export const WHITE = new Float32Array([1.0, 1.0, 1.0, 1.0]);

export const MAGENTA = new Float32Array([1.0, 0.0, 1.0, 1.0]);

export const DEFAULT_MATERIAL: Material = {
  name: "default",
  baseColorFactor: MAGENTA,
  alphaMode: "OPAQUE",
  alphaCutoff: 0.5,
  doubleSided: false,
};

export const IDENTITY_MAT4 = new Float32Array(GLM.mat4.create());
