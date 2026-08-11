import {
  bufferToHeader,
  bufferToString,
  HEADER_SIZE,
  headerToBuffer,
  MessageType,
  type Message,
} from ".";

export default class LoadLevelMessage implements Message {
  id: number;
  sentAt: bigint;
  levelId: string;

  constructor(id: number, sentAt: bigint, levelId: string) {
    this.id = id;
    this.sentAt = sentAt;
    this.levelId = levelId;
  }

  static fromBuffer(buffer: Uint8Array): LoadLevelMessage {
    const header = bufferToHeader(buffer);

    const playerIdOffset = HEADER_SIZE;
    const { value: levelId } = bufferToString(buffer, playerIdOffset);

    return new LoadLevelMessage(header.id, header.sentAt, levelId);
  }

  toBuffer() {
    const encodedHeader = headerToBuffer(this);

    const encoder = new TextEncoder();
    const encodedLevelId = encoder.encode(this.levelId);

    const buffer = new Uint8Array(HEADER_SIZE + 1 + encodedLevelId.byteLength);
    buffer[0] = MessageType.LoadLevel;
    buffer.set(encodedHeader, 1);
    buffer[HEADER_SIZE] = encodedLevelId.byteLength;
    buffer.set(encodedLevelId, HEADER_SIZE + 1);

    return buffer;
  }
}
