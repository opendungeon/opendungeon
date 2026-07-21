const MAX_RECONNECT_ATTEMPTS = 5;

export default class ReconnectingWebSocket {
  private url: string | URL;
  private protocols?: string | string[];
  private shouldClose: boolean;
  private socket: WebSocket | null;
  private reconnectAttempts: number;

  onmessage: ((ev: MessageEvent<Blob>) => any) | null;

  constructor(url: string | URL, protocols?: string | string[]) {
    this.url = url;
    this.protocols = protocols;
    this.shouldClose = false;
    this.socket = null;
    this.reconnectAttempts = 0;
    this.onmessage = null;
  }

  connect() {
    this.socket = new WebSocket(this.url, this.protocols);

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
    };

    this.socket.onclose = () => {
      if (this.shouldClose) {
        return;
      }

      if (this.reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
        console.error("exceeded max reconnect attempts");
        return;
      }

      this.reconnectAttempts += 1;
      setTimeout(() => this.connect(), 1000 * 2 ** this.reconnectAttempts);
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
    if (!this.socket) {
      return;
    }

    this.shouldClose = true;
    this.socket.close(code, reason);
  }

  send(data: BufferSource | Blob | string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("not connected");
    }

    this.socket.send(data);
  }
}
