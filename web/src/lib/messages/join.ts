import { bufferToHeader, bufferToString, HEADER_SIZE, headerToBuffer, type Message } from ".";

export default class JoinMessage implements Message {
  id: number;
  sentAt: bigint;
  playerId: string;
  playerName: string;

  constructor(id: number, sentAt: bigint, playerId: string, playerName: string) {
    this.id = id;
    this.sentAt = sentAt;
    this.playerId = playerId;
    this.playerName = playerName;
  }

  static fromBuffer(buffer: Uint8Array): JoinMessage {
    const header = bufferToHeader(buffer);

    const playerIdOffset = HEADER_SIZE;
    const { value: playerId, byteLength } = bufferToString(buffer, playerIdOffset);

    const playerNameOffset = HEADER_SIZE + byteLength + 1;
    const { value: playerName } = bufferToString(buffer, playerNameOffset);

    return new JoinMessage(header.id, header.sentAt, playerId, playerName);
  }

  toBuffer(): Uint8Array {
    const encodedHeader = headerToBuffer(this);

    const encoder = new TextEncoder();
    const encodedPlayerId = encoder.encode(this.playerId);
    const encodedPlayerName = encoder.encode(this.playerName);

    const buffer = new Uint8Array(
      encodedHeader.byteLength + 1 + encodedPlayerId.byteLength + 1 + encodedPlayerName.byteLength,
    );
    buffer.set(encodedHeader);
    buffer[encodedHeader.byteLength] = encodedPlayerId.byteLength;
    buffer.set(encodedPlayerId, encodedHeader.byteLength + 1);
    buffer[encodedHeader.byteLength + 1 + encodedPlayerId.byteLength] =
      encodedPlayerName.byteLength;
    buffer.set(encodedPlayerName, encodedHeader.byteLength + 1 + encodedPlayerId.byteLength + 1);

    return buffer;
  }
}
