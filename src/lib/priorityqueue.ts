export class PriorityQueue<T> {
  private elements: { value: T; priority: number }[];

  constructor() {
    this.elements = [];
  }

  get length(): number {
    return this.elements.length;
  }

  get isEmpty(): boolean {
    return this.length === 0;
  }

  push(value: T, priority: number) {
    this.elements.push({ value, priority });
    this.bubbleUp();
  }

  pop(): T | null {
    if (this.isEmpty) {
      return null;
    }

    const { value } = this.elements[0];
    if (this.length === 1) {
      this.elements = [];
      return value;
    }

    this.elements[0] = this.elements.pop()!;
    this.pushDown();

    return value;
  }

  private less(i: number, j: number): boolean {
    return this.elements[i].priority < this.elements[j].priority;
  }

  private swap(i: number, j: number) {
    const original = this.elements[i];
    this.elements[i] = this.elements[j];
    this.elements[j] = original;
  }

  private static getParentIndex(i: number): number {
    return Math.trunc((i - 1) / 2);
  }

  private static getLeftChildIndex(i: number): number {
    return 2 * i + 1;
  }

  private static getRightChildIndex(i: number): number {
    return 2 * i + 2;
  }

  private bubbleUp() {
    let i = this.length - 1;
    let j = PriorityQueue.getParentIndex(i);

    while (this.less(i, j)) {
      this.swap(i, j);
      i = j;
      j = PriorityQueue.getParentIndex(i);
    }
  }

  private pushDown() {
    const n = this.length;
    let i = 0;

    while (true) {
      const left = PriorityQueue.getLeftChildIndex(i);
      const right = PriorityQueue.getRightChildIndex(i);

      let smallest = i;
      if (left < n && this.less(left, smallest)) {
        smallest = left;
      }
      if (right < n && this.less(right, smallest)) {
        smallest = right;
      }

      if (smallest == i) {
        break;
      }

      this.swap(i, smallest);
      i = smallest;
    }
  }
}
