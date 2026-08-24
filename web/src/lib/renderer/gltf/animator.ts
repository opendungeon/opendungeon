import type InstanceGLTF from "$lib/renderer/gltf/instance";
import type DynamicGLTF from "$lib/renderer/gltf/dynamic";
import { DoublyLinkedList } from "$lib/doublylinkedlist";

type Animation =
  | {
      instance: InstanceGLTF;
      name: string;
      start: number;
      duration: number;
      loop: false;
      onFinish?: () => void;
    }
  | {
      instance: InstanceGLTF;
      name: string;
      start: number;
      duration: number;
      loop: true;
    };

/**
 * glTF Animation Manager.
 *
 * Playing multiple animations on the same glTF instance is undefined behavior!
 * It's up to the caller to ensure that animations are played individually.
 */
export default class GLTFAnimator {
  private lastTime: number;
  private queue: DoublyLinkedList<Animation>;
  private active: DoublyLinkedList<Animation>;

  constructor() {
    this.lastTime = 0;
    this.active = new DoublyLinkedList<Animation>();
    this.queue = new DoublyLinkedList<Animation>();
  }

  tick(time: number) {
    this.lastTime = time;

    this.queue.forEach((animation, index) => {
      if (animation.start <= time) {
        this.active.append(animation);
        this.queue.remove(index);
      }
    });

    this.active.forEach((animation, index) => {
      if (time - animation.start > animation.duration && !animation.loop) {
        this.active.remove(index);
        animation.onFinish?.();
        return;
      }

      const animationTime = !animation.loop ? time - animation.start : time % animation.duration;
      animation.instance.applyAnimation(animation.name, animationTime);

      animation.instance.updateTransforms();
      animation.instance.computeSkinningMatrix();
    });
  }

  playOnce(model: DynamicGLTF, instance: InstanceGLTF, animation: string, onFinish?: () => void) {
    const { duration } = model.animations[animation];

    this.queue.append({
      name: animation,
      start: this.lastTime,
      loop: false,
      onFinish,
      duration,
      instance,
    });
  }

  playLoop(model: DynamicGLTF, instance: InstanceGLTF, animation: string) {
    const { duration } = model.animations[animation];

    this.queue.append({
      name: animation,
      start: this.lastTime,
      loop: true,
      duration,
      instance,
    });
  }
}
