import { RedisClient } from "bun";
import { VALKEY_USER, VALKEY_PASSWORD, VALKEY_HOST } from "$app/env/private";
import { type LevelData } from "../database/levels";
import type { ServerMessage } from "#lib/messages.js";
import type { GameCharacter, GamePlayer, GameState } from "#lib/server/live/state.js";

const client = new RedisClient(`valkey://${VALKEY_USER}:${VALKEY_PASSWORD}@${VALKEY_HOST}`);

export async function initialize() {
  await client.connect();
}

export async function listen(
  gameId: string,
  callback: (message: ServerMessage, close: () => Promise<void>) => void,
) {
  const listener = await client.duplicate();
  await listener.subscribe(gameId, (content) => {
    const message: ServerMessage = JSON.parse(content);
    callback(message, () => listener.unsubscribe(gameId));
  });
}

export async function createGame(gameId: string, state?: GameState) {
  await client.send("JSON.SET", [
    gameId,
    "$",
    state
      ? JSON.stringify({ ...state, lastDisconnect: Date.now() })
      : `{"level":null,"players":{},"characters":{},"lastDisconnect":${Date.now()}}`,
  ]);
}

export async function deleteGame(gameId: string) {
  await client.del(gameId);
}

export async function notify(gameId: string, message: ServerMessage) {
  await client.publish(gameId, JSON.stringify(message));
}

export async function getState(gameId: string): Promise<GameState | null> {
  const jsonStr = await client.send("JSON.GET", [gameId, "$"]);
  if (!jsonStr) {
    return null;
  }

  const rows: GameState[] = JSON.parse(jsonStr);
  if (rows.length < 1) {
    return null;
  }

  const [state] = rows;
  return state;
}

export async function setLevel(gameId: string, level: LevelData) {
  await client.send("JSON.SET", [gameId, "$.level", JSON.stringify(level), "XX"]);
}

export async function addPlayer(
  gameId: string,
  { userId, username, avatarUri, permissionLevel }: GamePlayer,
) {
  await client.send("JSON.SET", [
    gameId,
    `$.players.${userId}`,
    JSON.stringify({ username, avatarUri, permissionLevel }),
  ]);
}

export async function getPlayer(gameId: string, userId: string): Promise<GamePlayer | null> {
  const jsonStr = await client.send("JSON.GET", [gameId, `$.players.${userId}`]);
  if (!jsonStr) {
    return null;
  }

  const rows: Omit<GamePlayer, "userId">[] = JSON.parse(jsonStr);
  if (rows.length < 1) {
    return null;
  }

  const [player] = rows;
  return { userId, ...player };
}

export async function removePlayer(gameId: string, userId: string) {
  await client.send("JSON.DEL", [gameId, `$.players.${userId}`]);
  await client.send("JSON.SET", [gameId, "$.lastDisconnect", String(Date.now())]);
}

export async function addCharacter(
  gameId: string,
  { userId, characterId, uri, x, y }: GameCharacter,
) {
  await client.send("JSON.SET", [
    gameId,
    `$.characters.${characterId}`,
    JSON.stringify({ userId, uri, x, y }),
    "NX",
  ]);
}

export async function getCharacter(
  gameId: string,
  characterId: string,
): Promise<GameCharacter | null> {
  const jsonStr = await client.send("JSON.GET", [gameId, `$.characters.${characterId}`]);
  if (!jsonStr) {
    return null;
  }

  const rows: Omit<GameCharacter, "characterId">[] = JSON.parse(jsonStr);
  if (rows.length < 1) {
    return null;
  }

  const [character] = rows;
  return { characterId, ...character };
}

export async function editCharacter(
  gameId: string,
  characterId: string,
  { userId, uri, x, y }: Omit<GameCharacter, "characterId">,
) {
  await client.send("JSON.SET", [
    gameId,
    `$.characters.${characterId}`,
    JSON.stringify({ userId, uri, x, y }),
    "XX",
  ]);
}
