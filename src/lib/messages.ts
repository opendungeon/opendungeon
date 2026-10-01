import type { GameData } from "$lib/server/database/games";

type Header = {
  id: number;
  senderId: string;
  sentAt: number;
};

export type AckMessage = Header & {
  type: "ack";
  promptId: number;
  accepted: boolean;
};

export type AnimateMessage = Header & {
  type: "animate";
  characterId: number;
  animationId: string;
};

export type ChatMessage = Header & {
  type: "chat";
  playerId: string;
  content: string;
};

export type JoinMessage = Header & {
  type: "join";
  playerId: string;
  playerName: string;
};

export type LeaveMessage = Header & {
  type: "leave";
  playerId: string;
};

export type LoadCharacterMessage = Header & {
  type: "loadcharacter";
  playerId: string;
  uri: string;
  x: number;
  y: number;
};

export type LoadLevelMessage = Header & {
  type: "loadlevel";
  levelId: string;
};

export type MoveMessage = Header & {
  type: "move";
  characterId: string;
  x: number;
  y: number;
};

export type PingMessage = Header & {
  type: "ping";
  playerId: string;
  x: number;
  y: number;
};

export type SyncMessage = Header & {
  type: "sync";
  data: GameData;
};

export type Message =
  | AckMessage
  | AnimateMessage
  | ChatMessage
  | JoinMessage
  | LeaveMessage
  | LoadCharacterMessage
  | LoadLevelMessage
  | MoveMessage
  | PingMessage
  | SyncMessage;
