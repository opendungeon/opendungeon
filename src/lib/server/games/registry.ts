import type { GameState } from "#lib/server/games/index.ts";
import { GameServer } from "#lib/server/games/server.ts";
import { keystore as defaultKeystore, type KeyStore } from "#lib/server/keystore/index.ts";

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
