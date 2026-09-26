import * as db from "$lib/server/database";
import type { ServerInit } from "@sveltejs/kit";

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
