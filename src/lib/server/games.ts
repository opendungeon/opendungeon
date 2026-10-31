import { Level } from "#lib/level.js";
import { ServerMessageType, type ServerMessage } from "#lib/messages.js";
import { Cartesian } from "#lib/point.js";
import { keystore as defaultKeystore, type KeyStore } from "#lib/server/keystore/index.js";
import type { S3Client } from "bun";
import type { PubSub } from "./pubsub";
import { files as defaultFileStorage } from "./files";
import { error, ok, type Result } from "result";
import type { PlayerColor } from "#lib/colors.js";
import type { LevelData } from "./database/levels";

export type GamePlayer =
  | {
      isGameMaster: true;
      userId: string;
      username: string;
      avatarUri: string | null;
      online: boolean;
    }
  | {
      isGameMaster: false;
      color: PlayerColor;
      userId: string;
      username: string;
      avatarUri: string | null;
      online: boolean;
    };

export type GameCharacter = {
  characterId: string;
  userId: string;
  x: number;
  y: number;
  /** in radians */
  rot: number;
};

export type GameState = {
  characters: Record<string, Omit<GameCharacter, "characterId">>;
  levelUri: string | null;
  players: Record<string, Omit<GamePlayer, "userId">>;
  lastDisconnect: number;
};

function getInitialGameState(): GameState {
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

  async publish(message: ServerMessage) {
    this.pubsub.publish(this.gameId, JSON.stringify(message));
  }

  async subscribe(callbackfn: (message: ServerMessage) => void): Promise<() => void> {
    const id = await this.pubsub.subscribe(this.gameId, (value: string) => {
      const message: ServerMessage = JSON.parse(value);
      callbackfn(message);
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

    const message: ServerMessage = {
      type: ServerMessageType.LevelLoaded,
      name: "TODO: set this",
      data,
    };
    await this.pubsub.publish(this.gameId, JSON.stringify(message));

    return ok(undefined);
  }

  // automatically determine color here
  async addPlayer(player: GamePlayer) {
    await this.keystore.jsonSet(this.gameId, `$.players.${player.userId}`, player);
  }

  async getPlayer(userId: string): Promise<GamePlayer | null> {
    const player = await this.keystore.jsonGet(this.gameId, `$.players.${userId}`);
    if (!player) {
      return null;
    }

    return { ...player, userId } as GamePlayer;
  }

  async updatePlayer(userId: string, online: boolean) {
    await this.keystore.jsonSet(this.gameId, `$.players.${userId}.online`, online);
  }

  async addCharacter({ userId, characterId, x, y, rot }: GameCharacter) {
    await this.keystore.jsonSet(this.gameId, `$.characters.${characterId}`, {
      userId,
      x,
      y,
      rot,
    });
  }

  async getCharacter(characterId: string): Promise<GameCharacter | null> {
    const character = await this.keystore.jsonGet(this.gameId, `$.characters.${characterId}`);
    if (!character) {
      return null;
    }

    return { ...character, characterId } as GameCharacter;
  }

  async moveCharacter(characterId: string, x: number, y: number): Promise<Result<void, string>> {
    console.log("moving character");

    if (!this.level) {
      return error("No active level.");
    }

    const character = await this.getCharacter(characterId);
    if (!character) {
      return error("Character not found.");
    }

    const path = this.level.shortestPath(
      new Cartesian(character.x, character.y),
      new Cartesian(x, y),
    );
    if (path.length === 0) {
      return error("No valid path.");
    }

    await this.keystore.jsonSet(this.gameId, `$.characters.${characterId}`, { ...character, x, y });

    const message: ServerMessage = {
      type: ServerMessageType.CharacterMoved,
      characterId,
      x,
      y,
    };
    await this.pubsub.publish(this.gameId, JSON.stringify(message));

    return ok(undefined);
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
