import type { LevelData } from "#lib/server/database/levels.js";
import type { GameState } from "#lib/server/live/state.js";

/**
 * A message sent by the server.
 */
export type ServerMessage =
  | PlayerJoined
  | PlayerLeft
  | ChatReceived
  | LevelLoaded
  | CharacterLoaded
  | CharacterMoved
  | DataSynced
  | MapPinged;

export enum ServerMessageType {
  PlayerJoined = 0,
  PlayerLeft,
  ChatReceived,
  LevelLoaded,
  CharacterLoaded,
  CharacterMoved,
  DataSynced,
  MapPinged,
}

export type PlayerJoined = {
  type: ServerMessageType.PlayerJoined;
  userId: string;
  username: string;
  avatarUri: string | null;
  permissionLevel: "game_master" | "player";
};

export type PlayerLeft = {
  type: ServerMessageType.PlayerLeft;
  userId: string;
};

export type ChatReceived = {
  type: ServerMessageType.ChatReceived;
  senderId: string;
  content: string;
};

export type LevelLoaded = {
  type: ServerMessageType.LevelLoaded;
  name: string;
  data: LevelData;
};

export type CharacterLoaded = {
  type: ServerMessageType.CharacterLoaded;
  userId: string;
  characterId: string;
  uri: string;
  x: number;
  y: number;
};

export type CharacterMoved = {
  type: ServerMessageType.CharacterMoved;
  characterId: string;
  x: number;
  y: number;
};

export type DataSynced = {
  type: ServerMessageType.DataSynced;
  state: GameState;
};

export type MapPinged = {
  type: ServerMessageType.MapPinged;
  userId: string;
  x: number;
  y: number;
};
