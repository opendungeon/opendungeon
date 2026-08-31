import { DoublyLinkedList } from "$lib/doublylinkedlist";
import { Cartesian } from "$lib/point";

export type Animation =
  | {
      type: "value";
      from: number;
      to: number;
      start: number;
      duration: number;
      onTick: (value: number) => void;
      onFinish?: () => void;
    }
  | {
      type: "position";
      from: Cartesian;
      to: Cartesian;
      start: number;
      duration: number;
      onTick: (position: Cartesian) => void;
      onFinish?: () => void;
    };

export default class Animator {
  private lastTime: number;
  private queue: DoublyLinkedList<Animation>;
  private active: DoublyLinkedList<Animation>;

  constructor() {
    this.lastTime = 0;
    this.active = new DoublyLinkedList();
    this.queue = new DoublyLinkedList();
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
      if (time - animation.start > animation.duration) {
        this.active.remove(index);
        animation.onFinish?.();
        return;
      }

      const t = (time - animation.start) / animation.duration;

      if (animation.type === "position") {
        const position = Cartesian.lerp(animation.from, animation.to, t);
        animation.onTick(position);
      }

      if (animation.type === "value") {
        const a = animation.from;
        const b = animation.to;

        animation.onTick(a + (b - a) * t);
      }
    });
  }

  playValue(
    from: number,
    to: number,
    duration: number,
    onTick: (value: number) => void,
    onFinish?: () => void,
  ) {
    this.queue.append({
      type: "value",
      start: this.lastTime,
      from,
      to,
      duration,
      onTick,
      onFinish,
    });
  }
}
