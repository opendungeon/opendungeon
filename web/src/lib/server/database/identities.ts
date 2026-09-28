import { db } from "$lib/server/database";

type ThirdPartyIdentity = {
  identityId: string;
  userId: string;
  providerUid: string;
  providerId: string;
};

export function isThirdPartyIdentity(identity: Identity): identity is ThirdPartyIdentity {
  const hasProviderUid = Object.values(identity).includes("providerUid");
  return hasProviderUid;
}

type FirstPartyIdentity = {
  identityId: string;
  userId: string;
  passwordDigest: string;
  providerId: string;
};

export function isFirstPartyIdentity(identity: Identity): identity is FirstPartyIdentity {
  const hasPasswordDigest = Object.values(identity).includes("passwordDigest");
  return hasPasswordDigest;
}

type Identity = ThirdPartyIdentity | FirstPartyIdentity;

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
