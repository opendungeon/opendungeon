import {
  bufferToHeader,
  bufferToString,
  HEADER_SIZE,
  headerToBuffer,
  MessageType,
  type Message,
} from ".";

export default class LeaveMessage implements Message {
  id: number;
  sentAt: bigint;
  playerId: string;

  constructor(id: number, sentAt: bigint, playerId: string) {
    this.id = id;
    this.sentAt = sentAt;
    this.playerId = playerId;
  }

  static fromBuffer(buffer: Uint8Array): LeaveMessage {
    const header = bufferToHeader(buffer);

    const playerIdOffset = HEADER_SIZE;
    const { value: playerId } = bufferToString(buffer, playerIdOffset);

    return new LeaveMessage(header.id, header.sentAt, playerId);
  }

  toBuffer(): Uint8Array {
    const encodedHeader = headerToBuffer(this);

    const encoder = new TextEncoder();
    const encodedPlayerId = encoder.encode(this.playerId);

    const buffer = new Uint8Array(HEADER_SIZE + 1 + encodedPlayerId.byteLength);
    buffer[0] = MessageType.Leave;
    buffer.set(encodedHeader, 1);
    buffer[HEADER_SIZE] = encodedPlayerId.byteLength;
    buffer.set(encodedPlayerId, HEADER_SIZE + 1);

    return buffer;
  }
}
