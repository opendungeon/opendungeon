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
  private queue: Animation[];
  private active: Animation[];

  constructor() {
    this.lastTime = 0;
    this.active = [];
    this.queue = [];
  }

  tick(time: number) {
    this.lastTime = time;

    const waiting: Animation[] = [];
    for (const animation of this.queue) {
      if (animation.start <= time) {
        this.active.push(animation);
      } else {
        waiting.push(animation);
      }
    }
    this.queue = waiting;

    const running: Animation[] = [];
    for (const animation of this.active) {
      const elapsed = time - animation.start;
      if (elapsed > animation.duration) {
        animation.onFinish?.();
        continue;
      }

      const t =
        animation.type === "once"
          ? (time - animation.start) / animation.duration
          : ((time - animation.start) / animation.rate) % 1.0;

      const a = animation.from;
      const b = animation.to;
      animation.onTick(a + (b - a) * t);
      running.push(animation);
    }
    this.active = running;
  }

  playValue(
    from: number,
    to: number,
    duration: number,
    onTick: (value: number) => void,
    onFinish?: () => void,
  ) {
    this.queue.push({
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
    this.queue.push({
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
