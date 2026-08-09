import {
  bufferToHeader,
  bufferToLongString,
  bufferToString,
  HEADER_SIZE,
  headerToBuffer,
  MessageType,
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
      HEADER_SIZE + 1 + encodedPlayerId.byteLength + 4 + encodedContent.byteLength,
    );
    buffer[0] = MessageType.Chat;
    buffer.set(encodedHeader, 1);
    buffer[HEADER_SIZE] = encodedPlayerId.byteLength;
    buffer.set(encodedPlayerId, HEADER_SIZE + 1);
    const view = new DataView(buffer.buffer, HEADER_SIZE + 1 + encodedPlayerId.byteLength, 4);
    view.setInt32(0, encodedContent.byteLength, true);
    buffer.set(encodedContent, HEADER_SIZE + 1 + encodedPlayerId.byteLength + 4);

    return buffer;
  }
}
