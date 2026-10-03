import { db } from "#lib/server/database/index.js";

export type Level = {
  level_id: string;
  name: string;
  user_id: string;
  uri: string;
  created_at: Date;
  updated_at: Date;
};

export type LevelData = {
  version: number;
  textures: string[];
  decorations: string[];
  grid: ({
    texture: number; // -1 indicates empty
    decoration: {
      index: number;
      rotation: number; // radians
      scale: number;
    } | null;
  } | null)[][];
};

export async function upsertLevel(
  userId: string,
  levelId: string,
  name: string,
  uri: string,
): Promise<Level> {
  const rows = await db<[Level]>`
    INSERT INTO levels (level_id, name, user_id, uri)
    VALUES (${levelId}, ${name}, ${userId}, ${uri})
    ON CONFLICT (level_id)
    DO UPDATE SET name = EXCLUDED.name,
      uri = EXCLUDED.uri;
  `;

  const [level] = rows;
  return level;
}

export async function listUserLevels(userId: string): Promise<Level[]> {
  const levels = await db<Level[]>`
    SELECT level_id,
      name,
      user_id,
      uri,
      created_at,
      updated_at
    FROM levels
    WHERE user_id = ${userId};
  `;

  return levels;
}

export async function getUserLevel(userId: string, levelId: string): Promise<Level | null> {
  const rows = await db<Level[]>`
    SELECT level_id,
      name,
      user_id,
      uri,
      created_at,
      updated_at
    FROM levels
    WHERE user_id = ${userId}
      AND level_id = ${levelId};
  `;
  if (rows.length < 1) {
    return null;
  }

  const [level] = rows;
  return level;
}

export async function deleteLevel(userId: string, levelId: string): Promise<Level | null> {
  const rows = await db<Level[]>`
    DELETE FROM levels
    WHERE user_id = ${userId}
      AND level_id = ${levelId}
    RETURNING level_id,
      name,
      user_id,
      uri,
      created_at,
      updated_at;
  `;
  if (rows.length < 1) {
    return null;
  }

  const [level] = rows;
  return level;
}
