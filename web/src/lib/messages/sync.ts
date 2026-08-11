import type { APIRoom } from "$lib/api";
import {
  bufferToHeader,
  bufferToLongString,
  HEADER_SIZE,
  headerToBuffer,
  MessageType,
  type Message,
} from ".";

export default class SyncMessage implements Message {
  id: number;
  sentAt: bigint;
  data: APIRoom;

  constructor(id: number, sentAt: bigint, data: APIRoom) {
    this.id = id;
    this.sentAt = sentAt;
    this.data = data;
  }

  static fromBuffer(buffer: Uint8Array): SyncMessage {
    const header = bufferToHeader(buffer);

    const dataOffset = HEADER_SIZE;
    const { value } = bufferToLongString(buffer, dataOffset);
    console.log(value);
    const data = JSON.parse(value);

    return new SyncMessage(header.id, header.sentAt, data);
  }

  toBuffer() {
    const encodedHeader = headerToBuffer(this);

    const encoder = new TextEncoder();
    const encodedData = encoder.encode(JSON.stringify(this.data));

    const buffer = new Uint8Array(HEADER_SIZE + 4 + encodedData.byteLength);
    buffer[0] = MessageType.Sync;
    buffer.set(encodedHeader, 1);
    const view = new DataView(buffer.buffer, HEADER_SIZE, 4);
    view.setInt32(0, encodedData.byteLength, true);
    buffer.set(encodedData, HEADER_SIZE + 4);

    return buffer;
  }
}
