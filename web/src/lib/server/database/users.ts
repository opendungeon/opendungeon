import { db } from "$lib/server/database";

type User = {
  userId: string;
  email: string;
  isAdmin: boolean;
};

export async function createUser(email: string, isAdmin: boolean): Promise<User> {
  const rows = await db<[User]>`
    insert into users (email, is_admin)
    values (${email}, ${isAdmin})
    returning user_id,
      email,
      is_admin;
  `;

  const [user] = rows;
  return user;
}
