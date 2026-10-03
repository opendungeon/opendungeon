import { db } from "#lib/server/database/index.js";

type PlayerPermissionLevel = "game_master" | "player";

export type Player = {
  player_id: string;
  game_id: string;
  user_id: string;
  permission_level: PlayerPermissionLevel;
};

export async function createPlayer(
  gameId: string,
  userId: string,
  permissionLevel: PlayerPermissionLevel,
) {
  const [player] = await db<[Player]>`
    INSERT INTO players (game_id, user_id, permission_level)
    VALUES (${gameId}, ${userId}, ${permissionLevel})
    RETURNING player_id,
      game_id,
      user_id,
      permission_level;
  `;

  return player;
}

export async function getPlayer(gameId: string, userId: string): Promise<Player | null> {
  const rows = await db<Player[]>`
    SELECT player_id,
      game_id,
      user_id,
      permission_level
    FROM players
    WHERE game_id = ${gameId}
      AND user_id = ${userId}
  `;
  if (rows.length < 1) {
    return null;
  }

  const [player] = rows;
  return player;
}
