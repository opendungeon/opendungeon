import type { PlayerColor } from "#lib/colors.ts";
import type { Expression } from "#lib/diceroller.ts";
import { Level } from "#lib/level.ts";
import { Point, type Coord } from "#lib/point.ts";
import type { LevelData } from "#lib/server/database/levels.ts";
import { files as defaultFileStorage } from "#lib/server/files/index.ts";
import { keystore as defaultKeystore, type KeyStore } from "#lib/server/keystore/index.ts";
import type { PubSub } from "#lib/server/pubsub.ts";
import { calculatePosition } from "#lib/utils.ts";
import { error, ok, type Result } from "@opendungeon/result";
import type { S3Client } from "bun";

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
  userId: string;
  lastMove: Move | null;
};

export type GameState = {
  characters: Record<string, GameCharacter>;
  levelUri: string | null;
  players: Record<string, GameMaster | GamePlayer>;
  lastDisconnect: number;
};

type ChatEvent = {
  userId: string;
  message: string;
};

type PlayerAddEvent = {
  player: GamePlayer;
};

type PlayerJoinEvent = {
  userId: string;
};

type PlayerLeaveEvent = {
  userId: string;
};

type CharacterLoadEvent = {
  userId: string;
  characterId: string;
  coord: Coord;
};

type CharacterMoveEvent = {
  characterId: string;
  move: Move;
};

type LevelLoadEvent = {
  uri: string;
  data: LevelData;
};

type PingEvent = {
  userId: string;
  coord: Coord;
};

export interface GameEventHandlers {
  chat: ChatEvent;
  playeradd: PlayerAddEvent;
  playerjoin: PlayerJoinEvent;
  playerleave: PlayerLeaveEvent;
  characterload: CharacterLoadEvent;
  charactermove: CharacterMoveEvent;
  levelload: LevelLoadEvent;
  ping: PingEvent;
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

export class GameServer {
  private gameId: string;
  private keystore: KeyStore;
  private pubsub: PubSub;
  private files: S3Client;
  private level: Level | null;

  private constructor(gameId: string, keystore: KeyStore, pubsub: PubSub, files: S3Client) {
    this.gameId = gameId;
    this.keystore = keystore;
    this.pubsub = pubsub;
    this.files = files;
    this.level = null;
  }

  static async start(
    gameId: string,
    initialState = getInitialGameState(),
    keystore = defaultKeystore,
    pubsub = keystore as unknown as PubSub,
    files = defaultFileStorage,
  ): Promise<GameServer> {
    await keystore.jsonSet(gameId, "$", initialState);

    const gs = new GameServer(gameId, keystore, pubsub, files);
    if (initialState.levelUri) {
      const data = await gs.uriToLevelData(initialState.levelUri);
      if (data) {
        gs.level = Level.load(data);
      }
    }

    return gs;
  }

  async destroy() {
    await this.keystore.jsonDelete(this.gameId, "$");
  }

  async subscribe(callbackfn: (payload: GameEventPayload) => void): Promise<() => void> {
    const id = await this.pubsub.subscribe(this.gameId, (value: string) => {
      const payload: GameEventPayload = JSON.parse(value);
      callbackfn(payload);
    });

    return () => this.pubsub.unsubscribe(id);
  }

  async getState(): Promise<GameState> {
    const state = await this.keystore.jsonGet(this.gameId, "$");
    if (!state) {
      throw new Error("Failed to get state for active game.");
    }

    return state as GameState;
  }

  async sendChat(userId: string, message: string) {
    const event: ChatEvent = { userId, message };
    await this.pubsub.publish(this.gameId, JSON.stringify({ type: "chat", event }));
  }

  async setLevelUri(levelUri: string): Promise<Result<void, string>> {
    await Promise.all([
      this.keystore.jsonSet(this.gameId, "$.levelUri", levelUri),
      this.keystore.jsonSet(this.gameId, "$.characters", {}),
    ]);

    const data = await this.uriToLevelData(levelUri);
    if (!data) {
      return error("Level data not found.");
    }
    this.level = Level.load(data);

    const event: LevelLoadEvent = {
      uri: levelUri,
      data,
    };
    await this.pubsub.publish(this.gameId, JSON.stringify({ type: "levelload", event }));

    return ok(undefined);
  }

  async addPlayer(player: Omit<GamePlayer, "color">) {
    const color = "orange"; // TODO: actually determine color;
    await this.keystore.jsonSet(this.gameId, `$.players.${player.userId}`, { ...player, color });

    const event: PlayerAddEvent = {
      player: { ...player, color },
    };
    await this.pubsub.publish(this.gameId, JSON.stringify({ type: "playeradd", event }));
  }

  async getPlayer(userId: string): Promise<GameMaster | GamePlayer | null> {
    const player = await this.keystore.jsonGet(this.gameId, `$.players.${userId}`);
    if (!player) {
      return null;
    }

    return { ...player, userId } as GameMaster | GamePlayer;
  }

  async join(userId: string) {
    await this.keystore.jsonSet(this.gameId, `$.players.${userId}.online`, true);
    const event: PlayerJoinEvent = {
      userId,
    };
    await this.pubsub.publish(this.gameId, JSON.stringify({ type: "playerjoin", event }));
  }

  async leave(userId: string) {
    await this.keystore.jsonSet(this.gameId, `$.players.${userId}.online`, false);
    const event: PlayerLeaveEvent = {
      userId,
    };
    await this.pubsub.publish(this.gameId, JSON.stringify({ type: "playerleave", event }));
  }

  async loadCharacter(userId: string, coord: Coord): Promise<string> {
    const characterId = crypto.randomUUID();
    await this.keystore.jsonSet(this.gameId, `$.characters.${characterId}`, {
      lastMove: {
        path: [coord],
        startTime: 0,
        velocity: 0,
      },
      userId,
      characterId,
    });

    const event: CharacterLoadEvent = {
      userId,
      characterId,
      coord,
    };
    await this.pubsub.publish(this.gameId, JSON.stringify({ type: "characterload", event }));

    return characterId;
  }

  async getCharacter(characterId: string): Promise<GameCharacter | null> {
    const character = await this.keystore.jsonGet(this.gameId, `$.characters.${characterId}`);
    if (!character) {
      return null;
    }

    return { ...character, characterId } as GameCharacter;
  }

  async moveCharacter(
    characterId: string,
    startTime: number,
    velocity: number,
    { x, y }: Coord,
  ): Promise<Result<void, string>> {
    if (!this.level) {
      return error("No active level.");
    }

    const character = await this.getCharacter(characterId);
    if (!character) {
      return error("Character not found.");
    }

    const path = !character.lastMove
      ? [new Point(x, y)]
      : (() => {
          const currentPoint = calculatePosition(performance.now(), character.lastMove);
          return this.level.shortestPath(currentPoint, new Point(x, y)).path;
        })();
    if (path.length === 0) {
      return error("No valid path.");
    }

    await this.keystore.jsonSet(this.gameId, `$.characters.${characterId}.lastMove`, {
      startTime,
      velocity,
      path,
    });

    const event: CharacterMoveEvent = {
      characterId,
      move: {
        path,
        startTime,
        velocity,
      },
    };
    await this.pubsub.publish(this.gameId, JSON.stringify({ type: "charactermove", event }));

    return ok(undefined);
  }

  async ping(userId: string, coord: Coord) {
    const event: PingEvent = { userId, coord };
    await this.pubsub.publish(this.gameId, JSON.stringify({ type: "ping", event }));
  }

  async roll(userId: string, expression: Expression) {
    // TODO: implement commands and such
  }

  private async uriToLevelData(levelUri: string): Promise<LevelData | null> {
    const file = this.files.file(levelUri!);
    const exists = await file.exists();
    if (!exists) {
      return null;
    }

    const data = await file.json();
    return data;
  }
}

class GameRegistry {
  private keystore: KeyStore;
  private servers: Record<string, GameServer>;

  constructor(keystore: KeyStore) {
    this.keystore = keystore;
    this.servers = {};
  }

  add(gameId: string, server: GameServer) {
    this.servers[gameId] = server;
  }

  async get(gameId: string): Promise<GameServer | null> {
    const active = this.servers[gameId];
    if (active) {
      return active;
    }

    const state: GameState = await this.keystore.jsonGet(gameId, "$");
    if (!state) {
      return null;
    }

    const server = await GameServer.start(gameId, state);
    this.servers[gameId] = server;
    return server;
  }

  async delete(gameId: string) {
    await this.keystore.jsonDelete(gameId, "$");
    delete this.servers[gameId];
  }

  *[Symbol.iterator](): Generator<[string, GameServer]> {
    for (const [key, value] of Object.entries(this.servers)) {
      yield [key, value];
    }
  }
}

export const games: GameRegistry = new GameRegistry(defaultKeystore);
