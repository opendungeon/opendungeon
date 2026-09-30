import { db } from "$lib/server/database";

export type Profile = {
  profile_id: string;
  user_id: string;
  username: string;
  avatar_uri: string | null;
  created_at: Date;
  updated_at: Date;
};

export async function createProfile(
  userId: string,
  username: string,
  avatarUri: string | null,
): Promise<Profile> {
  const [profile] = await db<[Profile]>`
    INSERT INTO profiles (user_id, username, avatar_uri)
    VALUES (${userId}, ${username}, ${avatarUri})
    RETURNING profile_id,
      user_id,
      username,
      avatar_uri,
      created_at,
      updated_at;
  `;

  return profile;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const rows = await db<Profile[]>`
    SELECT profile_id,
      user_id,
      username,
      avatar_uri,
      created_at,
      updated_at
    FROM profiles
    WHERE user_id = ${userId};
  `;
  if (rows.length < 1) {
    return null;
  }

  const [profile] = rows;
  return profile;
}
