export default class ArenaAllocator {
  private elementSize: number;
  private length: number;
  private _buffer: Float32Array;

  constructor(elementSize: number, capacity: number) {
    if (elementSize <= 0) {
      throw new Error("elementSize must be positive and nonzero");
    }
    if (capacity < 0) {
      throw new Error("capacity must be nonnegative");
    }

    this.elementSize = elementSize;
    this.length = 0;
    this._buffer = new Float32Array(capacity * elementSize);
  }

  get buffer(): Float32Array {
    return this._buffer.subarray(0, this.length * this.elementSize);
  }

  get capacity(): number {
    return this._buffer.length / this.elementSize;
  }

  get size(): number {
    return this.length;
  }

  allocate(count: number): Float32Array {
    if (count < 0) {
      throw new Error("size must be nonnegative");
    }

    this.grow(this.length + count);
    const start = this.length * this.elementSize;
    const end = start + count * this.elementSize;
    this.length += count;
    return this._buffer.subarray(start, end);
  }

  reset() {
    this.length = 0;
  }

  private grow(count: number) {
    const neededSize = count * this.elementSize;
    if (this._buffer.length >= neededSize) {
      return;
    }

    // grow exponentially to avoid allocations
    const extendedSize = Math.max(neededSize, this._buffer.length * 2);
    const buffer = new Float32Array(extendedSize);
    buffer.set(this._buffer);
    this._buffer = buffer;
  }
}
