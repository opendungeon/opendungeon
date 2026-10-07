import { defineEnvVars } from "@sveltejs/kit/env";
import { building } from "$app/env";

export const variables = defineEnvVars({
  DISCORD_CLIENT_ID: {
    schema(value) {
      return value;
    },
  },
  DISCORD_CLIENT_SECRET: {
    schema(value) {
      return value;
    },
  },
  VALKEY_USER: {
    schema(value) {
      if (!building && !value) {
        throw new Error("Missing required environment variable $VALKEY_USER");
      }
      return value;
    },
  },
  VALKEY_PASSWORD: {
    schema(value) {
      if (!building && !value) {
        throw new Error("Missing required environment variable $VALKEY_PASSWORD");
      }
      return value;
    },
  },
  VALKEY_HOST: {
    schema(value) {
      if (!building && !value) {
        throw new Error("Missing required environment variable $VALKEY_HOST");
      }
      return value;
    },
  },
  AWS_ACCESS_KEY_ID: {
    schema(value) {
      if (!building && !value) {
        throw new Error("Missing required environment variable $AWS_ACCESS_KEY_ID");
      }
      return value;
    },
  },
  AWS_SECRET_ACCESS_KEY: {
    schema(value) {
      if (!building && !value) {
        throw new Error("Missing required environment variable $AWS_SECRET_ACCESS_KEY");
      }
      return value;
    },
  },
  S3_BUCKET: {
    schema(value) {
      if (!building && !value) {
        throw new Error("Missing required environment variable $S3_BUCKET");
      }
      return value;
    },
  },
  S3_URL: {
    schema(value) {
      if (!building && !value) {
        throw new Error("Missing required environment variable $S3_URL");
      }
      return value;
    },
  },
  POSTGRES_HOST: {
    schema(value) {
      if (!building && !value) {
        throw new Error("Missing required environment variable $POSTGRES_HOST");
      }
      return value;
    },
  },
  POSTGRES_PORT: {
    schema(value) {
      if (!building && !value) {
        throw new Error("Missing required environment variable $POSTGRES_PORT");
      }
      return value;
    },
  },
  POSTGRES_DB: {
    schema(value) {
      if (!building && !value) {
        throw new Error("Missing required environment variable $POSTGRES_DB");
      }
      return value;
    },
  },
  POSTGRES_USER: {
    schema(value) {
      if (!building && !value) {
        throw new Error("Missing required environment variable $POSTGRES_USER");
      }
      return value;
    },
  },
  POSTGRES_PASSWORD: {
    schema(value) {
      if (!building && !value) {
        throw new Error("Missing required environment variable $POSTGRES_PASSWORD");
      }
      return value;
    },
  },
  MIGRATIONS_DIR: {
    static: true,
  },
});
