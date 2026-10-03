import { db } from "#lib/server/database/index.js";

export type Session = {
  session_id: string;
  user_id: string;
  created_at: Date;
  updated_at: Date;
  expires_at: Date;
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
      AND expires_at > CURRENT_TIMESTAMP;
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
