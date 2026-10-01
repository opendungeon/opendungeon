import { db } from "$lib/server/database";

type ThirdPartyIdentity = {
  identity_id: string;
  user_id: string;
  provider_uid: string;
  provider_id: string;
};

export function isThirdPartyIdentity(identity: Identity): identity is ThirdPartyIdentity {
  const hasProviderUid = Object.values(identity).includes("provider_uid");
  return hasProviderUid;
}

type EmailIdentity = {
  identity_id: string;
  user_id: string;
  password_digest: string;
  provider_id: string;
};

export function isEmailIdentity(identity: Identity): identity is EmailIdentity {
  const hasPasswordDigest = Object.values(identity).includes("password_digest");
  return hasPasswordDigest;
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
    SELECT identity_id,
      user_id,
      password_digest,
      provider_uid,
      provider_id
    FROM users u
    JOIN identities i
      on u.user_id = i.user_id
    WHERE u.email = ${email}
  `;

  return rows;
}
