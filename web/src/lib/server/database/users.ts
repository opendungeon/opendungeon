import { db } from "$lib/server/database";

type User = {
  user_id: string;
  email: string;
  is_admin: boolean;
};

export async function createUser(email: string, isAdmin: boolean): Promise<User> {
  const rows = await db<[User]>`
    INSERT INTO users (email, is_admin)
    VALUES (${email}, ${isAdmin})
    RETURNING user_id,
      email,
      is_admin;
  `;

  const [user] = rows;
  return user;
}

export async function getUser(userId: string): Promise<User | null> {
  const rows = await db<User[]>`
    SELECT user_id,
      email,
      is_admin
    FROM users
    where user_id = ${userId};
  `;
  if (rows.length < 1) {
    return null;
  }

  const [user] = rows;
  return user;
}
