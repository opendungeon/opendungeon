import {
  bufferToHeader,
  bufferToLongString,
  bufferToString,
  HEADER_SIZE,
  headerToBuffer,
  type Message,
} from ".";

export default class ChatMessage implements Message {
  id: number;
  sentAt: bigint;
  playerId: string;
  content: string;

  constructor(id: number, sentAt: bigint, playerId: string, content: string) {
    this.id = id;
    this.sentAt = sentAt;
    this.playerId = playerId;
    this.content = content;
  }

  static fromBuffer(buffer: Uint8Array): ChatMessage {
    const header = bufferToHeader(buffer);

    const playerIdOffset = HEADER_SIZE;
    const { value: playerId, byteLength } = bufferToString(buffer, playerIdOffset);

    const contentOffset = HEADER_SIZE + byteLength + 1;
    const { value: content } = bufferToLongString(buffer, contentOffset);

    return new ChatMessage(header.id, header.sentAt, playerId, content);
  }

  toBuffer() {
    const encodedHeader = headerToBuffer(this);

    const encoder = new TextEncoder();
    const encodedPlayerId = encoder.encode(this.playerId);
    const encodedContent = encoder.encode(this.content);

    const buffer = new Uint8Array(
      encodedHeader.byteLength + 1 + encodedPlayerId.byteLength + 4 + encodedContent.byteLength,
    );
    buffer.set(encodedHeader);
    buffer[encodedHeader.byteLength] = encodedPlayerId.byteLength;
    buffer.set(encodedPlayerId, encodedHeader.byteLength + 1);
    const view = new DataView(
      buffer.buffer,
      encodedHeader.byteLength + 1 + encodedPlayerId.byteLength,
      4,
    );
    view.setInt32(0, encodedContent.byteLength, true);
    buffer.set(encodedContent, encodedHeader.byteLength + 1 + encodedPlayerId.byteLength + 4);

    return buffer;
  }
}
