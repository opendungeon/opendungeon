import { DoublyLinkedList } from "#lib/doublylinkedlist.js";

export type Animation =
  | {
      type: "once";
      from: number;
      to: number;
      start: number;
      duration: number;
      onTick: (value: number) => void;
      onFinish?: () => void;
    }
  | {
      type: "once" | "loop";
      from: number;
      to: number;
      rate: number;
      start: number;
      duration: number;
      onTick: (value: number) => void;
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

      const t =
        animation.type === "once"
          ? (time - animation.start) / animation.duration
          : ((time - animation.start) / animation.rate) % 1.0;

      const a = animation.from;
      const b = animation.to;
      const value = a + (b - a) * t;
      animation.onTick(value);
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
      type: "once",
      start: this.lastTime,
      from,
      to,
      duration,
      onTick,
      onFinish,
    });
  }

  loopValue(
    from: number,
    to: number,
    rate: number,
    duration: number,
    onTick: (value: number) => void,
    onFinish?: () => void,
  ) {
    this.queue.append({
      type: "loop",
      start: this.lastTime,
      from,
      to,
      rate,
      duration,
      onTick,
      onFinish,
    });
  }
}
