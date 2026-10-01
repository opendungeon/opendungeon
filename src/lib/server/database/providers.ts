import { db } from "$lib/server/database";

type Provider = {
  provider_id: string;
  name: string;
};

export async function listProviders(): Promise<Provider[]> {
  const rows = await db<Provider[]>`
    SELECT provider_id,
      name
    FROM providers;
  `;

  return rows;
}
