import type { PlayerColor } from "#lib/colors.ts";
import type { Evaluation } from "#lib/diceroller.ts";
import type { Coord } from "#lib/point.ts";
import type { LevelData } from "#lib/server/database/levels.ts";

export type GameMaster = {
  isGameMaster: true;
  userId: string;
  username: string;
  avatarUri: string | null;
  online: boolean;
};

export type GamePlayer = {
  isGameMaster: false;
  color: PlayerColor;
  userId: string;
  username: string;
  avatarUri: string | null;
  online: boolean;
};

export type Move = {
  path: Coord[];
  velocity: number;
  startTime: number; // monotonic timestamp
};

export type GameCharacter = {
  characterId: string;
  name: string;
  userId: string;
  lastMove: Move | null;
};

export type GameState = {
  characters: Record<string, GameCharacter>;
  levelUri: string | null;
  players: Record<string, GameMaster | GamePlayer>;
  lastDisconnect: number;
};

export type LoadEvent = {
  state: GameState;
};

export type ChatEvent = {
  userId: string;
  message: string;
};

export type PlayerAddEvent = {
  player: GamePlayer;
};

export type PlayerJoinEvent = {
  userId: string;
};

export type PlayerLeaveEvent = {
  userId: string;
};

export type CharacterLoadEvent = {
  userId: string;
  characterId: string;
  coord: Coord;
  name: string;
};

export type CharacterMoveEvent = {
  characterId: string;
  move: Move;
};

export type CharacterDeleteEvent = {
  characterId: string;
  gameOnly: boolean;
};

export type LevelLoadEvent = {
  uri: string;
  data: LevelData;
};

export type PingEvent = {
  userId: string;
  coord: Coord;
};

export type RollEvent = {
  userId: string;
  evaluation: Evaluation;
};

export interface GameEventHandlers {
  load: LoadEvent;
  chat: ChatEvent;
  playeradd: PlayerAddEvent;
  playerjoin: PlayerJoinEvent;
  playerleave: PlayerLeaveEvent;
  characterload: CharacterLoadEvent;
  charactermove: CharacterMoveEvent;
  characterdelete: CharacterDeleteEvent;
  levelload: LevelLoadEvent;
  ping: PingEvent;
  roll: RollEvent;
}

export type GameEventPayload = {
  [K in keyof GameEventHandlers]: {
    type: K;
    event: GameEventHandlers[K];
  };
}[keyof GameEventHandlers];

export function getInitialGameState(): GameState {
  return {
    characters: {},
    levelUri: null,
    players: {},
    lastDisconnect: Date.now(),
  };
}
