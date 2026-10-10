import { VALKEY_USER, VALKEY_PASSWORD, VALKEY_HOST } from "$app/env/private";
import type { KeyStore, SetOptions } from "#lib/server/keystore/index.js";
import { RedisClient } from "bun";

export default class ValkeyKeyStore implements KeyStore {
  private client: RedisClient;
  private listeners: Record<number, RedisClient>;
  private listenerIdHandle: number;

  constructor() {
    this.client = new RedisClient(`valkey://${VALKEY_USER}:${VALKEY_PASSWORD}@${VALKEY_HOST}`);
    this.listeners = {};
    this.listenerIdHandle = 0;
  }

  async connect() {
    await this.client.connect();
  }

  async publish(key: string, value: string) {
    await this.client.publish(key, value);
  }

  async subscribe(key: string, callbackfn: (value: string) => void): Promise<number> {
    const listener = await this.client.duplicate();
    const listenerId = this.listenerIdHandle;
    this.listenerIdHandle++;
    this.listeners[listenerId] = listener;

    listener.subscribe(key, callbackfn);
    return listenerId;
  }

  async unsubscribe(id: number): Promise<void> {
    const listener = this.listeners[id];
    if (!listener) {
      return;
    }

    await listener.unsubscribe();
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async set(key: string, value: string, options?: SetOptions) {
    if (options?.ttl) {
      await this.client.set(key, value, "EX", options.ttl);
    } else {
      await this.client.set(key, value);
    }
  }

  async delete(key: string) {
    await this.client.del(key);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async jsonSet(key: string, path: string, value: any): Promise<void> {
    await this.client.send("JSON.SET", [key, path, JSON.stringify(value)]);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async jsonGet(key: string, path: string): Promise<any> {
    const jsonStr = await this.client.send("JSON.GET", [key, path]);
    if (!jsonStr) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[] = JSON.parse(jsonStr);
    if (rows.length < 1) {
      return null;
    }

    const [state] = rows;
    return state;
  }

  async jsonDelete(key: string, path: string): Promise<void> {
    await this.client.send("JSON.DEL", [key, path]);
  }
}
