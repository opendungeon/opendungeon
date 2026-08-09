import { bufferToHeader, HEADER_SIZE, headerToBuffer, MessageType, type Message } from ".";

export default class MoveMessage implements Message {
  id: number;
  sentAt: bigint;
  characterId: number;
  q: number;
  r: number;

  constructor(id: number, sentAt: bigint, characterId: number, q: number, r: number) {
    this.id = id;
    this.sentAt = sentAt;
    this.characterId = characterId;
    this.q = q;
    this.r = r;
  }

  static fromBuffer(buffer: Uint8Array): MoveMessage {
    const header = bufferToHeader(buffer);
    const characterId = buffer[HEADER_SIZE];
    const q = buffer[HEADER_SIZE + 1];
    const r = buffer[HEADER_SIZE + 2];

    return new MoveMessage(header.id, header.sentAt, characterId, q, r);
  }

  toBuffer(): Uint8Array {
    const encodedHeader = headerToBuffer(this);

    const buffer = new Uint8Array(HEADER_SIZE + 3);
    buffer[0] = MessageType.Move;
    buffer.set(encodedHeader, 1);
    buffer[HEADER_SIZE] = this.characterId;
    buffer[HEADER_SIZE + 1] = this.q;
    buffer[HEADER_SIZE + 2] = this.r;

    return buffer;
  }
}
