import { db } from "$lib/server/database";

type ThirdPartyIdentity = {
  identity_id: string;
  user_id: string;
  provider_uid: string;
  provider_id: string;
};

export function isThirdPartyIdentity(identity: Identity): identity is ThirdPartyIdentity {
  return Object.hasOwn(identity, "provider_uid");
}

type EmailIdentity = {
  identity_id: string;
  user_id: string;
  password_digest: string;
  provider_id: string;
};

export function isEmailIdentity(identity: Identity): identity is EmailIdentity {
  return Object.hasOwn(identity, "password_digest");
}

type Identity = ThirdPartyIdentity | EmailIdentity;

export async function createEmailIdentity(
  userId: string,
  passwordDigest: string,
): Promise<EmailIdentity> {
  const [created] = await db<[EmailIdentity]>`
    INSERT INTO identities (user_id, password_digest, provider_id)
    SELECT ${userId},
      ${passwordDigest},
      p.provider_id
    FROM providers p
    WHERE p.name = 'email'
    RETURNING identity_id,
      user_id,
      password_digest,
      provider_uid,
      provider_id;
  `;

  return created;
}

export async function listIdentitiesByEmail(email: string): Promise<Identity[]> {
  const rows = await db<Identity[]>`
    SELECT i.identity_id,
      i.user_id,
      i.password_digest,
      i.provider_uid,
      i.provider_id
    FROM users u
    JOIN identities i
      ON u.user_id = i.user_id
    WHERE u.email = ${email}
  `;

  return rows;
}
