import { db } from "#lib/server/database/index.js";

export type Configuration = {
  is_user_creation_enabled: boolean;
};

export async function getConfiguration(): Promise<Configuration> {
  const [configuration] = await db<[Configuration]>`
    SELECT is_user_creation_enabled
    FROM app_configuration;
  `;
  return configuration;
}

export async function updateConfiguration({
  is_user_creation_enabled,
}: Partial<Configuration>): Promise<Configuration> {
  const [configuration] = await db<[Configuration]>`
    UPDATE app_configuration
    SET is_user_creation_enabled = COALESCE(${is_user_creation_enabled}, is_user_creation_enabled)
    RETURNING is_user_creation_enabled;
  `;
  return configuration;
}
