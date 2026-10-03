import { db } from "#lib/server/database/index.js";

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
      provider_id;
  `;

  return created;
}

export async function createThirdPartyIdentity(
  userId: string,
  providerName: string,
  providerUid: string,
): Promise<ThirdPartyIdentity | null> {
  const rows = await db<ThirdPartyIdentity[]>`
    INSERT INTO identities (user_id, provider_uid, provider_id)
    SELECT ${userId},
      ${providerUid},
      p.provider_id
    FROM providers p
    WHERE p.name = ${providerName}
    RETURNING identity_id,
      user_id,
      provider_uid,
      provider_id;
  `;
  // no such provider exists
  if (rows.length < 1) {
    return null;
  }

  const [identity] = rows;
  return identity;
}

export async function getEmailIdentity(email: string): Promise<EmailIdentity | null> {
  const rows = await db<EmailIdentity[]>`
    SELECT i.identity_id,
      i.user_id,
      i.password_digest,
      i.provider_id
    FROM users u
    JOIN identities i
      ON u.user_id = i.user_id
    JOIN providers p
      ON i.provider_id = p.provider_id
    WHERE u.email = ${email}
      AND p.name = 'email';
  `;
  if (rows.length < 1) {
    return null;
  }

  const [identity] = rows;
  return identity;
}
export async function getThirdPartyIdentity(
  email: string,
  providerName: string,
): Promise<ThirdPartyIdentity | null> {
  const rows = await db<ThirdPartyIdentity[]>`
    SELECT i.identity_id,
      i.user_id,
      i.provider_uid,
      i.provider_id
    FROM users u
    JOIN identities i
      ON u.user_id = i.user_id
    JOIN providers p
      ON i.provider_id = p.provider_id
    WHERE u.email = ${email}
      AND p.name = ${providerName};
  `;
  if (rows.length < 1) {
    return null;
  }

  const [identity] = rows;
  return identity;
}
