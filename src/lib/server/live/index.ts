import { RedisClient } from "bun";
import { VALKEY_USER, VALKEY_PASSWORD, VALKEY_HOST } from "$env/static/private";
import type { Message } from "$lib/messages";

const client = new RedisClient(`valkey://${VALKEY_USER}:${VALKEY_PASSWORD}@${VALKEY_HOST}`);

export async function initialize() {
  await client.connect();
}

export async function listen(
  gameId: string,
  callback: (message: Message) => void,
): Promise<() => void> {
  const listener = await client.duplicate();
  await listener.subscribe(gameId, (content) => {
    const message: Message = JSON.parse(content);
    callback(message);
  });

  return () => {
    listener.unsubscribe(gameId);
  };
}

export async function notify(gameId: string, message: Message) {
  switch (message.type) {
    case "ack": {
      // ignore
      break;
    }
    case "animate": {
      client.publish(gameId, JSON.stringify(message));
      break;
    }
    case "chat": {
      client.publish(gameId, JSON.stringify(message));
      break;
    }
    case "join": {
      client.send("JSON.SET", [
        gameId,
        `$.players.${message.playerId}`,
        JSON.stringify({ playerName: message.playerName }),
      ]);
      client.publish(gameId, JSON.stringify(message));
      break;
    }
    case "leave": {
      // echo
      break;
    }
    case "loadcharacter": {
      client.send("JSON.SET", [
        gameId,
        `$.characters.${message.uri}`,
        JSON.stringify({ uri: message.uri, x: message.x, y: message.y }),
      ]);
      client.publish(gameId, JSON.stringify(message));
      break;
    }
    case "loadlevel": {
      // echo
      break;
    }
    case "move": {
      // echo
      break;
    }
    case "ping": {
      // echo
      break;
    }
    case "sync": {
      // echo
      break;
    }
  }
}
