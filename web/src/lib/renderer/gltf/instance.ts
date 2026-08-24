import DynamicGLTF from "$lib/renderer/gltf/dynamic";
import { MAT4_FLOAT_SIZE, TRS_SIZE, VEC3_FLOAT_SIZE, VEC4_FLOAT_SIZE } from "$lib/renderer/consts";
import assert from "$lib/assert";
import * as GLM from "gl-matrix";
import { clamp, sizeOfType } from "$lib/renderer/gltf/utils";

export default class InstanceGLTF {
  private trs: Float32Array;
  readonly model: DynamicGLTF;
  readonly globals: Float32Array;
  readonly jointMatrices: Float32Array[];
  transform: GLM.mat4;

  constructor(model: DynamicGLTF) {
    this.model = model;
    this.globals = new Float32Array(MAT4_FLOAT_SIZE * model.nodes.length);
    this.trs = new Float32Array(model.baseTRS);
    this.jointMatrices = model.skins.map(
      (s) => new Float32Array(MAT4_FLOAT_SIZE * s.joints.length),
    );
    this.transform = GLM.mat4.create();
  }

  applyAnimation(name: string, t: number) {
    const animation = this.model.animations[name];
    assert(animation !== undefined, `unknown animation "${name}"`);

    for (const { path, times, values, ...channel } of animation.channels) {
      const node = this.model.nodes[channel.node];
      const elementSize = sizeOfType(values.type);

      // find the two bordering input indices
      const a = times.buffer.findLastIndex((keyFrameTime) => keyFrameTime <= t);
      const b = times.buffer.findIndex((keyFrameTime) => keyFrameTime > t);
      assert(a >= 0 || b >= 0, "missing a and b frame");

      const localTime =
        b < 0
          ? 1
          : a < 0
            ? 0
            : clamp((t - times.buffer.at(a)!) / (times.buffer.at(b)! - times.buffer.at(a)!), 0, 1);

      const aFrame =
        a < 0
          ? values.buffer.subarray(0, elementSize)
          : values.buffer.subarray(elementSize * a, elementSize * (a + 1));
      const bFrame =
        b < 0
          ? values.buffer.subarray(values.buffer.length - elementSize, values.buffer.length)
          : values.buffer.subarray(elementSize * b, elementSize * (b + 1));

      const trs = this.trs.subarray(node.trsOffset, node.trsOffset + TRS_SIZE);
      switch (path) {
        case "translation": {
          const frame = GLM.vec3.create();
          GLM.vec3.lerp(frame, aFrame, bFrame, localTime);
          trs.set(frame);
          break;
        }
        case "rotation": {
          const frame = GLM.quat.create();
          GLM.quat.slerp(frame, aFrame, bFrame, localTime);
          trs.set(frame, VEC3_FLOAT_SIZE);
          break;
        }
        case "scale": {
          const frame = GLM.vec3.create();
          GLM.vec3.lerp(frame, aFrame, bFrame, localTime);
          trs.set(frame, VEC3_FLOAT_SIZE + VEC4_FLOAT_SIZE);
          break;
        }
        default:
          assert(false, `unsupported path: ${path}`);
      }
    }
  }

  // dfs scene graph to generate transforms
  updateTransforms() {
    for (const rootNode of this.model.scene.nodes) {
      const stack: Array<{ nodeIndex: number; parentGlobal: GLM.mat4 }> = [
        { nodeIndex: rootNode, parentGlobal: GLM.mat4.create() },
      ];

      while (stack.length > 0) {
        const { nodeIndex, parentGlobal } = stack.pop()!;
        const node = this.model.nodes[nodeIndex]!;

        const translation = this.trs.subarray(node.trsOffset, node.trsOffset + VEC3_FLOAT_SIZE);
        const rotation = this.trs.subarray(
          node.trsOffset + translation.length,
          node.trsOffset + translation.length + VEC4_FLOAT_SIZE,
        );
        const scale = this.trs.subarray(
          node.trsOffset + translation.length + rotation.length,
          node.trsOffset + translation.length + rotation.length + VEC3_FLOAT_SIZE,
        );

        const localTransform = GLM.mat4.create();
        GLM.mat4.fromRotationTranslationScale(localTransform, rotation, translation, scale);
        const globalTransform = GLM.mat4.create();
        GLM.mat4.mul(globalTransform, parentGlobal, localTransform);
        this.globals.set(globalTransform, nodeIndex * MAT4_FLOAT_SIZE);

        for (const child of node.children ?? []) {
          stack.push({ nodeIndex: child, parentGlobal: globalTransform });
        }
      }
    }
  }

  computeSkinningMatrix() {
    if (!this.model.jointed) {
      return;
    }

    for (const node of this.model.nodes) {
      if (node.skin === undefined) {
        continue;
      }

      const skin = this.model.skins[node.skin];
      const jointMatrices = this.jointMatrices[node.skin];

      for (let i = 0; i < skin.joints.length; i++) {
        const joint = skin.joints[i];
        const jointNode = this.model.nodes[joint];

        const globalJointTransform = this.globals.subarray(
          jointNode.globalTransform * MAT4_FLOAT_SIZE,
          MAT4_FLOAT_SIZE * (jointNode.globalTransform + 1),
        ) as GLM.mat4;

        const globalMeshTransform = this.globals.subarray(
          node.globalTransform * MAT4_FLOAT_SIZE,
          MAT4_FLOAT_SIZE * (node.globalTransform + 1),
        ) as GLM.mat4;
        const inverseGlobalMeshTransform = GLM.mat4.create();
        GLM.mat4.invert(inverseGlobalMeshTransform, globalMeshTransform);

        const inverseBindMatrix = skin.inverseBindMatrices.subarray(
          i * MAT4_FLOAT_SIZE,
          MAT4_FLOAT_SIZE * (i + 1),
        ) as GLM.mat4;

        const jointMatrix = GLM.mat4.create();
        GLM.mat4.mul(jointMatrix, inverseGlobalMeshTransform, globalJointTransform);
        GLM.mat4.mul(jointMatrix, jointMatrix, inverseBindMatrix);

        jointMatrices.set(jointMatrix, i * MAT4_FLOAT_SIZE);
      }
    }
  }
}
