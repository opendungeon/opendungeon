import type { Coord } from "#lib/point.ts";
import type { GameEventHandlers, GameEventPayload, GameState } from "#lib/server/games.ts";
import { error, ok, tryFetch, type Result } from "@opendungeon/result";

export class GameClient {
  private gameId: string;
  private eventSource: EventSource | null;

  onload: ((ev: GameEventHandlers["load"]) => void) | undefined;
  onchat: ((ev: GameEventHandlers["chat"]) => void) | undefined;
  onplayeradd: ((ev: GameEventHandlers["playeradd"]) => void) | undefined;
  onplayerjoin: ((ev: GameEventHandlers["playerjoin"]) => void) | undefined;
  onplayerleave: ((ev: GameEventHandlers["playerleave"]) => void) | undefined;
  oncharacterload: ((ev: GameEventHandlers["characterload"]) => void) | undefined;
  oncharactermove: ((ev: GameEventHandlers["charactermove"]) => void) | undefined;
  onlevelload: ((ev: GameEventHandlers["levelload"]) => void) | undefined;
  onping: ((ev: GameEventHandlers["ping"]) => void) | undefined;

  constructor(gameId: string) {
    this.gameId = gameId;
    this.eventSource = null;
  }

  async start(): Promise<Result<void, string>> {
    this.eventSource = new EventSource(`/api/games/${this.gameId}/stream`);

    this.eventSource.onmessage = async (event) => {
      const payload: GameEventPayload = JSON.parse(event.data);

      switch (payload.type) {
        case "chat": {
          this.onchat?.(payload.event);
          break;
        }
        case "playeradd": {
          this.onplayeradd?.(payload.event);
          break;
        }
        case "playerjoin": {
          this.onplayerjoin?.(payload.event);
          break;
        }
        case "playerleave": {
          this.onplayerleave?.(payload.event);
          break;
        }
        case "characterload": {
          this.oncharacterload?.(payload.event);
          break;
        }
        case "charactermove": {
          this.oncharactermove?.(payload.event);
          break;
        }
        case "levelload": {
          this.onlevelload?.(payload.event);
          break;
        }
        case "ping": {
          this.onping?.(payload.event);
          break;
        }
        default:
          console.error("action not supportes");
      }
    };

    const result = await tryFetch(`/api/games/${this.gameId}`);
    if (!result.ok) {
      this.eventSource.close();
      return error("Failed to connect to server.");
    }

    const state: GameState = await result.value.json();
    this.onload?.({ state });

    return ok(undefined);
  }

  destroy() {
    if (!this.eventSource) {
      return;
    }

    this.eventSource.close();
    this.eventSource = null;
  }

  async chat(message: string): Promise<Result<void, string>> {
    const result = await tryFetch(`/api/games/${this.gameId}/chat`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
    if (!result.ok) {
      return error(result.error.message);
    }

    const response = result.value;
    if (!response.ok) {
      const errorMessage = await response.text();
      return error(errorMessage);
    }

    return ok(undefined);
  }

  async addPlayer(userId: string): Promise<Result<void, string>> {
    const result = await tryFetch(`/api/games/${this.gameId}/players`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
    if (!result.ok) {
      return error(result.error.message);
    }

    const response = result.value;
    if (!response.ok) {
      const errorMessage = await response.text();
      return error(errorMessage);
    }

    return ok(undefined);
  }

  async loadCharacter(coord: Coord): Promise<Result<void, string>> {
    const result = await tryFetch(`/api/games/${this.gameId}/characters`, {
      method: "POST",
      body: JSON.stringify({ coord }),
    });
    if (!result.ok) {
      return error(result.error.message);
    }

    const response = result.value;
    if (!response.ok) {
      const errorMessage = await response.text();
      return error(errorMessage);
    }

    return ok(undefined);
  }

  async moveCharacter(
    characterId: string,
    velocity: number,
    destination: Coord,
  ): Promise<Result<void, string>> {
    const result = await tryFetch(`/api/games/${this.gameId}/characters/${characterId}`, {
      method: "PUT",
      body: JSON.stringify({ velocity, destination }),
    });
    if (!result.ok) {
      return error(result.error.message);
    }

    const response = result.value;
    if (!response.ok) {
      const errorMessage = await response.text();
      return error(errorMessage);
    }

    return ok(undefined);
  }

  async ping(coord: Coord): Promise<Result<void, string>> {
    const result = await tryFetch(`/api/games/${this.gameId}/pings`, {
      method: "POST",
      body: JSON.stringify({ coord }),
    });
    if (!result.ok) {
      return error(result.error.message);
    }

    const response = result.value;
    if (!response.ok) {
      const errorMessage = await response.text();
      return error(errorMessage);
    }

    return ok(undefined);
  }

  async loadLevel(levelId: string): Promise<Result<void, string>> {
    const result = await tryFetch(`/api/games/${this.gameId}/level`, {
      method: "PUT",
      body: JSON.stringify({ levelId }),
    });
    if (!result.ok) {
      return error(result.error.message);
    }

    const response = result.value;
    if (!response.ok) {
      const errorMessage = await response.text();
      return error(errorMessage);
    }

    return ok(undefined);
  }
}
