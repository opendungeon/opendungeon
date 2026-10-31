export interface PubSub {
  publish: (topic: string, message: string) => Promise<void>;
  subscribe: (topic: string, callbackfn: (message: string) => void) => Promise<number>;
  unsubscribe: (id: number) => Promise<void>;
}
