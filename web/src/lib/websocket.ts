const MAX_RECONNECT_ATTEMPTS = 5;

export default class ReconnectingWebSocket {
  private url: string | URL;
  private protocols?: string | string[];
  private shouldClose: boolean;
  private socket: WebSocket | null;
  private reconnectAttempts: number;
  private reconnectHandle: ReturnType<typeof setTimeout> | null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onmessage: ((ev: MessageEvent) => any) | null;

  constructor(url: string | URL, protocols?: string | string[]) {
    this.url = url;
    this.protocols = protocols;
    this.shouldClose = false;
    this.socket = null;
    this.reconnectAttempts = 0;
    this.reconnectHandle = null;
    this.onmessage = null;
  }

  connect() {
    this.socket = new WebSocket(this.url, this.protocols);

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
    };

    this.socket.onclose = (event) => {
      if (this.shouldClose || event.wasClean) {
        return;
      }

      if (this.reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
        console.error("exceeded max reconnect attempts");
        return;
      }

      this.reconnectAttempts += 1;
      this.reconnectHandle = setTimeout(() => this.connect(), 1000 * 2 ** this.reconnectAttempts);
    };

    this.socket.onerror = () => {
      if (!this.socket) {
        return;
      }

      this.socket.close();
    };

    this.socket.onmessage = this.onmessage;
  }

  close(code?: number, reason?: string) {
    this.shouldClose = true;

    if (this.reconnectHandle !== null) {
      clearTimeout(this.reconnectHandle);
      this.reconnectHandle = null;
    }

    this.socket?.close(code, reason);
  }

  send(data: BufferSource | Blob | string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("not connected");
    }

    this.socket.send(data);
  }
}
