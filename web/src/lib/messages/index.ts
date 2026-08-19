import type { APIProfile } from "$lib/api";

export enum MessageType {
  Ack = 0x0,
  Join,
  Leave,
  Chat,
  Anim,
  Move,
  Sync,
  LoadLevel,
}

export type GameMessage = {
  content: string;
  isSystemMessage: boolean;
  playerProfile: APIProfile;
};

export const HEADER_SIZE = 10;

export interface Message {
  id: number;
  sentAt: bigint;
}

export function bufferToHeader(buffer: Uint8Array): Message {
  const id = buffer[1];
  const view = new DataView(buffer.buffer, 2, 9);
  const sentAt = view.getBigInt64(0, true);
  return { id, sentAt };
}

export function headerToBuffer(header: Message, buffer = new Uint8Array(HEADER_SIZE)): Uint8Array {
  buffer[0] = header.id;
  const view = new DataView(buffer.buffer, 1, 8);
  view.setBigInt64(0, header.sentAt, true);
  return buffer;
}

export function bufferToString(
  buffer: Uint8Array,
  offset: number,
): { value: string; byteLength: number } {
  const strLen = buffer[offset];
  const strBuf = buffer.subarray(offset + 1, offset + 1 + strLen);
  const decoder = new TextDecoder("utf-8");
  const value = decoder.decode(strBuf);
  return { value, byteLength: strLen };
}

export function bufferToLongString(
  buffer: Uint8Array,
  offset: number,
): { value: string; byteLength: number } {
  const view = new DataView(buffer.buffer, offset, 4);
  const strLen = view.getInt32(0, true);
  const strBuf = buffer.subarray(offset + 4, offset + 4 + strLen);
  const decoder = new TextDecoder("utf-8");
  const value = decoder.decode(strBuf);
  return { value, byteLength: strLen };
}
