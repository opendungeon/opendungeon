import type { Message } from "$lib/messages";
import * as db from "$lib/server/database";
import { getSession } from "$lib/server/database/sessions";
import { fail, type Handle, type ServerInit } from "@sveltejs/kit";
import type { ServerWebSocket } from "bun";

const title = `
  ___                   ____
 / _ \\ _ __   ___ _ __ |  _ \\ _   _ _ __   __ _  ___  ___  _ __
| | | | '_ \\ / _ \\ '_ \\| | | | | | | '_ \\ / _\` |/ _ \\/ _ \\| '_ \\
| |_| | |_) |  __/ | | | |_| | |_| | | | | (_| |  __/ (_) | | | |
 \\___/| .__/ \\___|_| |_|____/ \\__,_|_| |_|\\__, |\\___|\\___/|_| |_|
      |_|                                 |___/
`;

export const init: ServerInit = async () => {
  await db.runMigrations();

  console.log(title);
  console.log(`Server Started on port "TODO: put port value here"`);
  // would also be nice to see API version and such
};

export const handle: Handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get("session_id") ?? "";
  const session = !sessionId ? null : await getSession(sessionId);
  event.locals.session = session;

  const isUpgrade = event.request.headers.get("upgrade")?.toLowerCase() === "websocket";
  const isWsRoute = event.url.pathname.startsWith("/ws");
  if (session && isUpgrade && isWsRoute) {
    const path = event.url.pathname.split("/").filter((segment) => !!segment);
    const gameIdIndex = path.findIndex((segment) => segment === "games") + 1;
    const gameId = path.at(gameIdIndex);
    if (!gameIdIndex || !gameId) {
      fail(404, "Game not found.");
    }

    if (event.platform?.server) {
      const ok = event.platform.server.upgrade(event.platform.request, {
        data: { userId: session.user_id, gameId },
      });
      if (ok) {
        return new Response(null, { status: 101 });
      }
    }
    console.error("WebSockets are unavailable in dev mode.");
  }

  return await resolve(event);
};

export const websocket = {
  open(ws: ServerWebSocket<{ userId: string; gameId: string }>) {},

  message(ws: ServerWebSocket<{ userId: string; gameId: string }>, message: Message) {},

  close(ws: ServerWebSocket<{ userId: string; gameId: string }>, code: number, reason: string) {},
};
