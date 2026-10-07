import type { LevelData } from "#lib/server/database/levels.js";

export type GamePlayer = {
  userId: string;
  username: string;
  avatarUri: string | null;
  permissionLevel: "game_master" | "player";
};

export type GameCharacter = {
  characterId: string;
  userId: string;
  uri: string;
  x: number;
  y: number;
};

export type GameState = {
  characters: Record<string, Omit<GameCharacter, "characterId">>;
  level: LevelData | null;
  players: Record<string, Omit<GamePlayer, "userId">>;
  lastDisconnect: number;
};
