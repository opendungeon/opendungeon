const CHANNEL_COUNT = 4;

export default class Texture {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array<ArrayBuffer>;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;

    const array = new Array<number>(width * height * CHANNEL_COUNT);
    array.fill(255);

    this.data = new Uint8Array(array);
  }
}
