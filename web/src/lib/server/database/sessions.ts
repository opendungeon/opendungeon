import { db } from "$lib/server/database";

type Session = {
  sessionId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
};

export async function createSession(userId: string, expiresAt: Date): Promise<Session> {
  const [created] = await db<[Session]>`
    INSERT INTO sessions (user_id, expires_at)
    VALUES (${userId}, ${expiresAt})
    RETURNING
      session_id,
      user_id,
      created_at,
      updated_at,
      expires_at;
  `;

  return created;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const rows = await db<[Session]>`
    SELECT session_id,
      user_id,
      created_at,
      updated_at,
      expires_at
    FROM sessions
    WHERE session_id = ${sessionId}
  `;

  if (rows.length < 1) {
    return null;
  }

  const [session] = rows;
  return session;
}

export async function deleteSession(sessionId: string) {
  await db`
    DELETE FROM sessions
    WHERE session_id = ${sessionId}
  `;
}
