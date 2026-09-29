import { db } from "$lib/server/database";

type Game = {
  game_id: string;
  name: string;
  user_id: string;
  uri: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

export async function listUserGames(userId: string): Promise<Game[]> {
  const games = await db<Game[]>`
    SELECT g.game_id,
      g.name,
      g.user_id,
      g.uri,
      g.is_active,
      g.created_at,
      g.updated_at
    FROM games g
    JOIN players p
      ON g.game_id = p.game_id
    WHERE p.user_id = ${userId}
  `;

  return games;
}
