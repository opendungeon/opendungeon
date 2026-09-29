import { db } from "$lib/server/database";

type Level = {
  level_id: string;
  name: string;
  user_id: string;
  uri: string;
  created_at: Date;
  updated_at: Date;
};

export async function listUserLevels(userId: string): Promise<Level[]> {
  const levels = await db<Level[]>`
    SELECT level_id,
      name,
      user_id,
      uri,
      created_at,
      updated_at
    FROM levels
    WHERE user_id = ${userId}
  `;

  return levels;
}
