export type GLTFVec3 = [number, number, number];

export type GLTFVec4 = [number, number, number, number];

export type GLTFMatrix = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export enum GLTFComponentType {
  SignedByte = 5120,
  UnsignedByte = 5121,
  SignedShort = 5122,
  UnsignedShort = 5123,
  UnsignedInt = 5125,
  Float = 5126,
}

export type GLTFType = "SCALAR" | "VEC2" | "VEC3" | "VEC4" | "MAT2" | "MAT3" | "MAT4";

export type GLTFMeshAttribute =
  | "POSITION"
  | "NORMAL"
  | "TANGENT"
  | `TEXCOORD_${number}`
  | `COLOR_${number}`
  | `JOINTS_${number}`
  | `WEIGHTS_${number}`;

export enum GLTFPrimitiveMode {
  Points = 0,
  Lines = 1,
  LineLoop = 2,
  LineStrip = 3,
  Triangles = 4,
  TriangleStrip = 5,
  TriangleFan = 6,
}

export enum GLTFViewTarget {
  ArrayBuffer = 34962,
  ElementArrayBuffer = 34963,
}

export type GLTFAccessor = {
  bufferView: number;
  byteOffset?: number;
  componentType: GLTFComponentType;
  count: number;
  max: number[];
  min: number[];
  type: GLTFType;
  sparse: {
    count: number;
    indices: {
      bufferView: number;
      byteOffset: 0;
      componentType: GLTFComponentType;
    };
    values: { bufferView: number; byteOffset: number };
  };
};

export type GLTFBuffer = { byteLength: number; uri: string };

export type GLTFBufferView = {
  buffer: number;
  byteLength: number;
  byteOffset?: number;
  byteStride?: number;
  target?: GLTFViewTarget;
};

export type GLTFImage = {
  bufferView?: number;
  mimeType?: string;
  uri?: string;
};

export type GLTFPrimitive = {
  attributes: Record<GLTFMeshAttribute, number>;
  indices: number;
  material?: number;
  mode?: GLTFPrimitiveMode;
};

export type GLTFAlphaMode = "OPAQUE" | "MASK" | "BLEND";

export type GLTFMaterial = {
  name: string;
  alphaMode?: GLTFAlphaMode;
  alphaCutoff?: number;
  doubleSided?: boolean;
  pbrMetallicRoughness?: {
    metallicFactor: number;
    roughnessFactor: number;
    baseColorFactor?: GLTFVec4;
    baseColorTexture?: {
      index: number;
      texCoord?: number;
    };
  };
};

export type GLTFMesh = {
  primitives: GLTFPrimitive[];
};

export type GLTFNode = {
  name: string;
  mesh?: number;
  children?: number[];
  camera?: number;
  matrix?: GLTFMatrix;
  rotation?: GLTFVec4;
  scale?: GLTFVec3;
  skin?: number;
  translation?: GLTFVec3;
};

export type GLTFSampler = {
  magFilter?: number;
  minFilter?: number;
  wrapS?: number;
  wrapT?: number;
};

export type GLTFScene = {
  name: string;
  nodes: number[];
};

export type GLTFSkin = {
  inverseBindMatrices: number;
  joints: number[];
  skeleton?: number;
};

export type GLTFTexture = { sampler?: number; source: number; name: string };

export type GLTFObject = {
  accessors: GLTFAccessor[];
  asset: { version: string; generator: string; copyright: string };
  buffers: GLTFBuffer[];
  bufferViews: GLTFBufferView[];
  images: GLTFImage[];
  materials?: GLTFMaterial[];
  meshes: GLTFMesh[];
  nodes: GLTFNode[];
  samplers: GLTFSampler[];
  scene: number;
  scenes: GLTFScene[];
  skins?: GLTFSkin[];
  textures?: GLTFTexture[];
};
