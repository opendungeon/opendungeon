import type { ServerMessage } from "#lib/messages.js";
import { keystore, type KeyStore } from "#lib/server/keystore/index.js";

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
  levelUri: string | null;
  players: Record<string, Omit<GamePlayer, "userId">>;
  lastDisconnect: number;
};

export default class GameRooms {
  private keystore: KeyStore;

  constructor(keystore: KeyStore) {
    this.keystore = keystore;
  }

  async publish(gameId: string, message: ServerMessage) {
    this.keystore.publish(gameId, JSON.stringify(message));
  }

  async subscribe(
    gameId: string,
    callbackfn: (message: ServerMessage) => void,
  ): Promise<() => void> {
    const id = await this.keystore.subscribe(gameId, (value: string) => {
      const message: ServerMessage = JSON.parse(value);
      callbackfn(message);
    });

    return () => this.keystore.unsubscribe(id);
  }

  async createGame(gameId: string, initialState?: GameState) {
    await this.keystore.jsonSet(
      gameId,
      "$",
      initialState ?? { characters: {}, levelUri: null, players: {}, lastDisconnect: Date.now() },
    );
  }

  async getGame(gameId: string): Promise<GameState | null> {
    const state = await this.keystore.jsonGet(gameId, "$");
    if (!state) {
      return null;
    }

    return state as GameState;
  }

  async deleteGame(gameId: string) {
    await this.keystore.delete(gameId);
  }

  async setGameLevelUri(gameId: string, levelUri: string) {
    await this.keystore.jsonSet(gameId, "$.levelUri", levelUri);
  }

  async addGamePlayer(
    gameId: string,
    { userId, username, avatarUri, permissionLevel }: GamePlayer,
  ) {
    await this.keystore.jsonSet(gameId, `$.players.${userId}`, {
      username,
      avatarUri,
      permissionLevel,
    });
  }

  async getGamePlayer(gameId: string, userId: string): Promise<GamePlayer | null> {
    const player = await this.keystore.jsonGet(gameId, `$.players.${userId}`);
    if (!player) {
      return null;
    }

    return { ...player, userId } as GamePlayer;
  }

  async deleteGamePlayer(gameId: string, userId: string) {
    await this.keystore.jsonDelete(gameId, `$.players.${userId}`);
    await this.keystore.jsonSet(gameId, "$.lastDisconnect", Date.now());
  }

  async addGameCharacter(gameId: string, { userId, characterId, uri, x, y }: GameCharacter) {
    await this.keystore.jsonSet(gameId, `$.characters.${characterId}`, { userId, uri, x, y });
  }

  async getGameCharacter(gameId: string, characterId: string): Promise<GameCharacter | null> {
    const character = await this.keystore.jsonGet(gameId, `$.characters.${characterId}`);
    if (!character) {
      return null;
    }

    return { ...character, characterId } as GameCharacter;
  }

  async updateGameCharacter(
    gameId: string,
    characterId: string,
    { userId, uri, x, y }: Omit<GameCharacter, "characterId">,
  ) {
    await this.keystore.jsonSet(gameId, `$.characters.${characterId}`, { userId, uri, x, y });
  }
}

export const gamerooms = new GameRooms(keystore);
