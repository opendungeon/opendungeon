import { PLAYER_COLORS } from "#lib/colors.ts";
import { DiceRoller, type Evaluation, type Expression } from "#lib/diceroller.ts";
import { Level } from "#lib/level.ts";
import { Point, type Coord } from "#lib/point.ts";
import type { LevelData } from "#lib/server/database/levels.ts";
import { files as defaultFileStorage } from "#lib/server/files/index.ts";
import {
  type GameEventPayload,
  type GameState,
  type ChatEvent,
  type LevelLoadEvent,
  type GamePlayer,
  type PlayerAddEvent,
  type CharacterMoveEvent,
  type PingEvent,
  type RollEvent,
  type PlayerLeaveEvent,
  type PlayerJoinEvent,
  type GameMaster,
  type CharacterLoadEvent,
  type GameCharacter,
  getInitialGameState,
} from "#lib/server/games/index.ts";
import { keystore as defaultKeystore, type KeyStore } from "#lib/server/keystore/index.ts";
import type { PubSub } from "#lib/server/pubsub.ts";
import { getMovePosition } from "#lib/utils.ts";
import { error, ok, type Result } from "@opendungeon/result";
import type { S3Client } from "bun";

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
      throw new Error(`Failed to get state for active game "${this.gameId}".`);
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

  async addPlayer(player: Omit<GamePlayer, "color">): Promise<Result<void, string>> {
    const state = await this.getState();

    const usedColors = new Set(
      Object.values(state.players).map((player) => (player.isGameMaster ? null : player.color)),
    );
    const availableColors = new Set(PLAYER_COLORS).difference(usedColors);
    const color = Array.from(availableColors).at(0);
    if (!color) {
      return error("All colors already in use.");
    }

    await this.keystore.jsonSet(this.gameId, `$.players.${player.userId}`, { ...player, color });

    const event: PlayerAddEvent = {
      player: { ...player, color },
    };
    await this.pubsub.publish(this.gameId, JSON.stringify({ type: "playeradd", event }));

    return ok(undefined);
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
          const { point } = getMovePosition(Date.now(), character.lastMove);
          return this.level.shortestPath(point.round(), new Point(x, y)).path;
        })();
    if (path.length === 0) {
      return error("No valid path.");
    }

    const startTime = Date.now();
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

  roll(userId: string, expression: Expression): Result<Evaluation, string> {
    const roller = DiceRoller.fromExpression(expression);
    const result = roller.evaluate();
    if (!result.ok) {
      return result;
    }

    const evaluation = result.value;
    const event: RollEvent = {
      userId,
      evaluation,
    };
    this.pubsub.publish(this.gameId, JSON.stringify({ type: "roll", event }));

    return ok(evaluation);
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
