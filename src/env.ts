import { defineEnvVars } from "@sveltejs/kit/env";

export const variables = defineEnvVars({
  DISCORD_CLIENT_ID: {},
  DISCORD_CLIENT_SECRET: {},
  VALKEY_USER: {},
  VALKEY_PASSWORD: {},
  VALKEY_HOST: {},
  AWS_ACCESS_KEY_ID: {},
  AWS_SECRET_ACCESS_KEY: {},
  S3_URL: {},
  POSTGRES_HOST: {},
  POSTGRES_PORT: {},
  POSTGRES_DB: {},
  POSTGRES_USER: {},
  POSTGRES_PASSWORD: {},
  MIGRATIONS_DIR: {},
});
