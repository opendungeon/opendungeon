import { bufferToHeader, HEADER_SIZE, headerToBuffer, MessageType, type Message } from ".";

export default class AckMessage implements Message {
  id: number;
  sentAt: bigint;
  promptId: number;
  accepted: boolean;

  constructor(id: number, sentAt: bigint, promptId: number, accepted: boolean) {
    this.id = id;
    this.sentAt = sentAt;
    this.promptId = promptId;
    this.accepted = accepted;
  }

  static fromBuffer(buffer: Uint8Array): AckMessage {
    const header = bufferToHeader(buffer);
    const promptId = buffer[HEADER_SIZE];
    const accepted = buffer[HEADER_SIZE + 1] === 1;
    return new AckMessage(header.id, header.sentAt, promptId, accepted);
  }

  toBuffer(): Uint8Array {
    const encodedHeader = headerToBuffer(this);

    const buffer = new Uint8Array(HEADER_SIZE + 2);
    buffer[0] = MessageType.Ack;
    buffer.set(encodedHeader, 1);
    buffer[HEADER_SIZE] = this.promptId;
    buffer[HEADER_SIZE + 1] = this.accepted ? 1 : 0;
    return buffer;
  }
}
