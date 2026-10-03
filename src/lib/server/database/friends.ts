import { db } from "#lib/server/database/index.js";
import type { Profile } from "#lib/server/database/profiles.js";

type Friend = {
  friend_id: string;
  sender_id: string;
  recipient_id: string;
  accepted: boolean;
  created_at: Date;
  updated_at: Date;
};

export async function createFriend(senderId: string, recipientId: string): Promise<Friend> {
  const [friend] = await db<[Friend]>`
    INSERT INTO friends (sender_id, recipient_id)
    VALUES (${senderId}, ${recipientId})
    RETURNING friend_id,
      sender_id,
      recipient_id,
      accepted,
      created_at,
      updated_at;
  `;

  return friend;
}

type FriendProfile = Friend & Omit<Profile, "profile_id" | "created_at" | "updated_at">;

export async function listFriendProfiles(userId: string): Promise<FriendProfile[]> {
  const friends = db<FriendProfile[]>`
    SELECT f.friend_id,
      f.sender_id,
      f.recipient_id,
      f.accepted,
      f.created_at,
      f.updated_at,
      p.user_id,
      p.username,
      p.avatar_uri
    FROM friends f
    JOIN profiles p
      ON (f.sender_id = p.user_id AND p.user_id <> ${userId})
      OR (f.recipient_id = p.user_id AND p.user_id <> ${userId})
    WHERE f.sender_id = ${userId}
      OR f.recipient_id = ${userId};
  `;
  return friends;
}

export async function updateFriend(
  userId: string,
  friendId: string,
  accepted: boolean,
): Promise<Friend | null> {
  const rows = await db<Friend[]>`
    UPDATE friends
    SET accepted = ${accepted},
      updated_at = CURRENT_TIMESTAMP
    WHERE friend_id = ${friendId}
      AND (sender_id = ${userId} OR recipient_id = ${userId})
    RETURNING friend_id,
      sender_id,
      recipient_id,
      accepted,
      created_at,
      updated_at;
  `;
  if (rows.length < 1) {
    return null;
  }

  const [friend] = rows;
  return friend;
}

export async function deleteFriend(userId: string, friendId: string): Promise<Friend | null> {
  const rows = await db<Friend[]>`
    DELETE FROM friends
    WHERE friend_id = ${friendId}
      AND (sender_id = ${userId} OR recipient_id = ${userId})
    RETURNING friend_id,
      sender_id,
      recipient_id,
      accepted,
      created_at,
      updated_at;
  `;
  if (rows.length < 1) {
    return null;
  }

  const [friend] = rows;
  return friend;
}
