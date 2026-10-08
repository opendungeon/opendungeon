import type { Handle, ServerInit } from "@sveltejs/kit/hooks";
import * as db from "#lib/server/database/index.js";
import * as live from "#lib/server/live/index.js";
import { getSession } from "#lib/server/database/sessions.js";
import { cleanupIdleGames } from "#lib/server/workers.js";

const title = `
  ___                   ____
 / _ \\ _ __   ___ _ __ |  _ \\ _   _ _ __   __ _  ___  ___  _ __
| | | | '_ \\ / _ \\ '_ \\| | | | | | | '_ \\ / _\` |/ _ \\/ _ \\| '_ \\
| |_| | |_) |  __/ | | | |_| | |_| | | | | (_| |  __/ (_) | | | |
 \\___/| .__/ \\___|_| |_|____/ \\__,_|_| |_|\\__, |\\___|\\___/|_| |_|
      |_|                                 |___/
`;

export const init: ServerInit = async () => {
  await Promise.all([db.runMigrations(), live.initialize()]);

  console.log(title);

  const port = process.env.PORT ?? "5173";
  console.log(`Server Starting on port ${port}.`);
  // would also be nice to see API version and such

  Bun.cron("*/10 * * * *", async () => {
    const count = await cleanupIdleGames();
    if (count >= 1) {
      console.log(`Cleaned up ${count} idle game(s).`);
    }
  });
  console.log("Started game cleanup worker.");
};

export const handle: Handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get("session_id") ?? "";
  const session = !sessionId ? null : await getSession(sessionId);
  event.locals.session = session;

  return await resolve(event);
};
