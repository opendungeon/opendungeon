import {
  bufferToHeader,
  bufferToString,
  HEADER_SIZE,
  headerToBuffer,
  MessageType,
  type Message,
} from ".";

export default class AnimMessage implements Message {
  id: number;
  sentAt: bigint;
  characterId: number;
  animationId: string;

  constructor(id: number, sentAt: bigint, characterId: number, animationId: string) {
    this.id = id;
    this.sentAt = sentAt;
    this.characterId = characterId;
    this.animationId = animationId;
  }

  static fromBuffer(buffer: Uint8Array): AnimMessage {
    const header = bufferToHeader(buffer);

    const characterId = buffer[HEADER_SIZE];
    const animationIdOffset = HEADER_SIZE + 1;
    const { value: animationId } = bufferToString(buffer, animationIdOffset);

    return new AnimMessage(header.id, header.sentAt, characterId, animationId);
  }

  toBuffer(): Uint8Array {
    const encodedHeader = headerToBuffer(this);

    const encoder = new TextEncoder();
    const encodedAnimationId = encoder.encode(this.animationId);

    const buffer = new Uint8Array(HEADER_SIZE + 1 + 1 + encodedAnimationId.byteLength);
    buffer[0] = MessageType.Anim;
    buffer.set(encodedHeader, 1);
    buffer[HEADER_SIZE] = this.characterId;
    buffer[HEADER_SIZE + 1] = encodedAnimationId.byteLength;
    buffer.set(encodedAnimationId, HEADER_SIZE + 2);

    return buffer;
  }
}
