import type { Coord } from "#lib/point.ts";
import type {
  GameEventHandlers,
  GameEventPayload,
  GameState,
  Measurement,
} from "#lib/server/games/index.ts";
import { error, ok, tryFetch, type Result } from "@opendungeon/result";

export class GameClient {
  private gameId: string;
  private eventSource: EventSource | null;

  onload: ((ev: GameEventHandlers["load"]) => void) | undefined;
  onchat: ((ev: GameEventHandlers["chat"]) => void) | undefined;
  onplayeradd: ((ev: GameEventHandlers["playeradd"]) => void) | undefined;
  onplayerjoin: ((ev: GameEventHandlers["playerjoin"]) => void) | undefined;
  onplayerleave: ((ev: GameEventHandlers["playerleave"]) => void) | undefined;
  onmeasure: ((ev: GameEventHandlers["measure"]) => void) | undefined;
  oncharacterload: ((ev: GameEventHandlers["characterload"]) => void) | undefined;
  oncharactermove: ((ev: GameEventHandlers["charactermove"]) => void) | undefined;
  oncharacterunload: ((ev: GameEventHandlers["characterunload"]) => void) | undefined;
  onlevelload: ((ev: GameEventHandlers["levelload"]) => void) | undefined;
  onping: ((ev: GameEventHandlers["ping"]) => void) | undefined;
  onroll: ((ev: GameEventHandlers["roll"]) => void) | undefined;

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
        case "measure": {
          this.onmeasure?.(payload.event);
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
        case "characterunload": {
          this.oncharacterunload?.(payload.event);
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
        case "roll": {
          this.onroll?.(payload.event);
          break;
        }
        default:
          console.error("Action not supported.");
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

  async measure(measurement: Measurement | null) {
    const result = await tryFetch(`/api/games/${this.gameId}/measure`, {
      method: "POST",
      body: JSON.stringify({ measurement }),
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

  async loadCharacter(
    characterId: string,
    name: string,
    coord: Coord,
  ): Promise<Result<void, string>> {
    const result = await tryFetch(`/api/games/${this.gameId}/characters`, {
      method: "POST",
      body: JSON.stringify({ characterId, name, coord }),
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

  async unloadCharacter(characterId: string): Promise<Result<void, string>> {
    const result = await tryFetch(`/api/games/${this.gameId}/characters/${characterId}`, {
      method: "DELETE",
      body: JSON.stringify({ characterId }),
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

  async command(command: string, args: string[]): Promise<Result<void, string>> {
    const result = await tryFetch(`/api/games/${this.gameId}/command`, {
      method: "POST",
      body: JSON.stringify({ command, args }),
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
