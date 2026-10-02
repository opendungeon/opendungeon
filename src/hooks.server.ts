import * as db from "$lib/server/database";
import * as live from "$lib/server/live";
import { getSession } from "$lib/server/database/sessions";
import { type Handle, type ServerInit } from "@sveltejs/kit";

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
  console.log(`Server Started on port "${port}"`);
  // would also be nice to see API version and such
};

export const handle: Handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get("session_id") ?? "";
  const session = !sessionId ? null : await getSession(sessionId);
  event.locals.session = session;

  return await resolve(event);
};
