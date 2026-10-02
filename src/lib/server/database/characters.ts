import { db } from "$lib/server/database";

export type Character = {
  character_id: string;
  name: string;
  user_id: string;
  uri: string;
  created_at: Date;
  updated_at: Date;
};

export async function listUserCharacters(userId: string): Promise<Character[]> {
  const characters = await db<Character[]>`
    SELECT character_id,
      name,
      user_id,
      uri,
      created_at,
      updated_at
    FROM characters
    WHERE user_id = ${userId}
  `;

  return characters;
}

export async function getUserCharacter(
  userId: string,
  characterId: string,
): Promise<Character | null> {
  const rows = await db<Character[]>`
    SELECT character_id,
      name,
      user_id,
      uri,
      created_at,
      updated_at
    FROM characters
    WHERE user_id = ${userId}
      AND character_id = ${characterId}
  `;
  if (rows.length < 1) {
    return null;
  }

  const [character] = rows;
  return character;
}
