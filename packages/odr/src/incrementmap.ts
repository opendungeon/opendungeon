export default class IncrementMap<T> {
  private map: Map<number, T>;
  private handle: number;

  constructor() {
    this.map = new Map();
    this.handle = 0;
  }

  get size(): number {
    return this.map.size;
  }

  create(value: T): number {
    const key = this.handle;
    this.map.set(key, value);
    this.handle++;
    return key;
  }

  get(id: number): T | undefined {
    return this.map.get(id);
  }

  delete(id: number): boolean {
    return this.map.delete(id);
  }

  clear() {
    this.map.clear();
  }

  [Symbol.iterator]() {
    return this.map.values();
  }
}
