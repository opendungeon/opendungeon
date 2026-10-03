import { db } from "#lib/server/database/index.js";
import type { Player } from "#lib/server/database/players.js";
import type { Profile } from "#lib/server/database/profiles.js";

export type Game = {
  game_id: string;
  name: string;
  user_id: string;
  uri: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

export async function createGame(userId: string, name: string, uri: string): Promise<Game> {
  const rows = await db<[Game]>`
    INSERT INTO games (name, user_id, uri, is_active)
    VALUES (${name}, ${userId}, ${uri}, true)
    RETURNING game_id,
      name,
      user_id,
      uri,
      is_active,
      created_at,
      updated_at;
  `;

  const [game] = rows;
  return game;
}

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

export type GameWithPlayerProfiles = Game & {
  game_master_id: string | null;
  players: (Omit<Profile, "profile_id"> & Player)[];
};

export async function listGamesWithPlayerProfiles(
  userId: string,
): Promise<GameWithPlayerProfiles[]> {
  const gamePlayerProfiles = await db<
    (Omit<Game, "user_id"> &
      Player &
      Omit<Profile, "created_at" | "updated_at"> & {
        creator_id: string;
        profile_created_at: Date;
        profile_updated_at: Date;
      })[]
  >`
    SELECT g.game_id,
      g.name,
      g.user_id as creator_id,
      g.uri,
      g.is_active,
      g.created_at,
      g.updated_at,
      p.user_id,
      p.permission_level,
      pf.username,
      pf.avatar_uri,
      pf.created_at as profile_created_at,
      pf.updated_at as profile_updated_at
    FROM games g
    LEFT JOIN players p
      ON g.game_id = p.game_id
    JOIN profiles pf
      ON p.user_id = pf.user_id
    WHERE EXISTS (
        SELECT 1
        FROM games eg
        JOIN players ep
          ON eg.game_id = ep.game_id
        WHERE g.game_id = eg.game_id
          AND ep.user_id = ${userId}
      )
  `;

  return Object.entries(Object.groupBy(gamePlayerProfiles, ({ game_id }) => game_id)).map(
    ([gameId, rows]) => {
      const first = gamePlayerProfiles.at(0)!;
      return {
        game_id: gameId,
        name: first.name,
        user_id: first.creator_id,
        game_master_id:
          rows?.find(({ permission_level }) => permission_level === "game_master")?.user_id ?? null,
        uri: first.uri,
        is_active: first.is_active,
        created_at: first.created_at,
        updated_at: first.updated_at,
        players:
          rows
            ?.filter(({ user_id }) => !!user_id)
            .map(
              ({
                user_id,
                username,
                avatar_uri,
                game_id,
                created_at,
                updated_at,
                player_id,
                permission_level,
              }) => ({
                user_id,
                username,
                avatar_uri,
                game_id,
                created_at,
                updated_at,
                player_id,
                permission_level,
              }),
            ) ?? [],
      };
    },
  );
}

export async function getUserGameWithPlayerProfiles(
  userId: string,
  gameId: string,
): Promise<GameWithPlayerProfiles | null> {
  const rows = await db<
    (Omit<Game, "user_id"> &
      Player &
      Omit<Profile, "created_at" | "updated_at"> & {
        creator_id: string;
        profile_created_at: Date;
        profile_updated_at: Date;
      })[]
  >`
    SELECT g.game_id,
      g.name,
      g.user_id as creator_id,
      g.uri,
      g.is_active,
      g.created_at,
      g.updated_at,
      p.user_id,
      p.permission_level,
      pf.username,
      pf.avatar_uri,
      pf.created_at as profile_created_at,
      pf.updated_at as profile_updated_at
    FROM games g
    LEFT JOIN players p
      ON g.game_id = p.game_id
    JOIN profiles pf
      ON p.user_id = pf.user_id
    WHERE g.game_id = ${gameId}
      AND EXISTS (
        SELECT 1
        FROM games eg
        JOIN players ep
          ON eg.game_id = ep.game_id
        WHERE g.game_id = eg.game_id
          AND ep.user_id = ${userId}
      )
  `;
  if (rows.length < 1) {
    return null;
  }

  const first = rows.at(0)!;
  return {
    game_id: gameId,
    name: first.name,
    user_id: first.creator_id,
    game_master_id:
      rows?.find(({ permission_level }) => permission_level === "game_master")?.user_id ?? null,
    uri: first.uri,
    is_active: first.is_active,
    created_at: first.created_at,
    updated_at: first.updated_at,
    players:
      rows
        ?.filter(({ user_id }) => !!user_id)
        .map(
          ({
            user_id,
            username,
            avatar_uri,
            game_id,
            created_at,
            updated_at,
            player_id,
            permission_level,
          }) => ({
            user_id,
            username,
            avatar_uri,
            game_id,
            created_at,
            updated_at,
            player_id,
            permission_level,
          }),
        ) ?? [],
  };
}

export async function isGamePlayer(gameId: string, userId: string): Promise<boolean> {
  const rows = await db<1[]>`
    SELECT 1
    FROM players
    WHERE game_id = ${gameId}
      AND user_id = ${userId}
  `;
  return rows.length >= 1;
}

export async function deleteGame(userId: string, gameId: string): Promise<Game | null> {
  const rows = await db<Game[]>`
    DELETE FROM games
    WHERE user_id = ${userId}
      AND game_id = ${gameId}
    RETURNING game_id,
      name,
      user_id,
      uri,
      is_active,
      created_at,
      updated_at;
  `;
  if (rows.length < 1) {
    return null;
  }

  const [game] = rows;
  return game;
}
