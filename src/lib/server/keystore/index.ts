import ValkeyKeyStore from "#lib/server/keystore/valkey.js";

export type SetOptions = {
  /** Time to live in seconds */
  ttl: number;
};

export interface KeyStore {
  publish(key: string, value: string): Promise<void>;
  subscribe(key: string, callbackfn: (value: string) => void): Promise<number>;
  unsubscribe(id: number): Promise<void>;
  set(key: string, value: string, options?: SetOptions): Promise<void>;
  get(key: string): Promise<string | null>;
  delete(key: string): Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jsonSet(key: string, path: string, value: any): Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jsonGet(key: string, path: string): Promise<any>;
  jsonDelete(key: string, path: string): Promise<void>;
}

export const keystore: KeyStore = new ValkeyKeyStore();
await (keystore as ValkeyKeyStore).connect();
