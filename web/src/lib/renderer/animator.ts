import type { DoublyLinkedList } from "$lib/doublylinkedlist";
import type { Cartesian } from "$lib/point";

type Animation =
  | {
      type: "color";
      from: Float32Array;
      to: Float32Array;
      duration: number;
      onTick: (color: Float32Array) => void;
      onFinish: () => void;
    }
  | {
      type: "position";
      from: Cartesian;
      to: Cartesian;
      duration: number;
      onTick: (position: Cartesian) => void;
      onFinish: () => void;
    };

export default class Animator {
  private queue: DoublyLinkedList<Animation>;
  private active: DoublyLinkedList<Animation>;
}
