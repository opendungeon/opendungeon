import type ModelInstance from "$lib/renderer/model/instance";
import type DynamicModel from "$lib/renderer/model/dynamic";
import { DoublyLinkedList } from "$lib/doublylinkedlist";

type ModelAnimation =
  | {
      instance: ModelInstance;
      name: string;
      start: number;
      duration: number;
      loop: false;
      onFinish?: () => void;
    }
  | {
      instance: ModelInstance;
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
export default class ModelAnimator {
  private lastTime: number;
  private queue: DoublyLinkedList<ModelAnimation>;
  private active: DoublyLinkedList<ModelAnimation>;

  constructor() {
    this.lastTime = 0;
    this.active = new DoublyLinkedList<ModelAnimation>();
    this.queue = new DoublyLinkedList<ModelAnimation>();
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

  playOnce(model: DynamicModel, instance: ModelInstance, animation: string, onFinish?: () => void) {
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

  playLoop(model: DynamicModel, instance: ModelInstance, animation: string) {
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
