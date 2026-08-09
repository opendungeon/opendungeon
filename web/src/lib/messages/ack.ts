import { bufferToHeader, HEADER_SIZE, headerToBuffer, type Message } from ".";

export default class AckMessage implements Message {
  id: number;
  sentAt: bigint;
  promptId: number;

  constructor(id: number, sentAt: bigint, promptId: number) {
    this.id = id;
    this.sentAt = sentAt;
    this.promptId = promptId;
  }

  static fromBuffer(buffer: Uint8Array): AckMessage {
    const header = bufferToHeader(buffer);
    const promptId = buffer[HEADER_SIZE];
    return new AckMessage(header.id, header.sentAt, promptId);
  }

  toBuffer(): Uint8Array {
    const buffer = new Uint8Array(HEADER_SIZE + 1);
    headerToBuffer(this, buffer);
    buffer[HEADER_SIZE] = this.promptId;
    return buffer;
  }
}
