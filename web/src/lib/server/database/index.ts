import { Glob, SQL } from "bun";
import {
  POSTGRES_HOST,
  POSTGRES_PORT,
  POSTGRES_DB,
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  MIGRATIONS_DIR,
} from "$env/static/private";

export const db = new SQL({
  hostname: POSTGRES_HOST,
  port: POSTGRES_PORT,
  database: POSTGRES_DB,
  username: POSTGRES_USER,
  password: POSTGRES_PASSWORD,
});

export async function runMigrations() {
  const glob = new Glob("*.sql");
  const dir = import.meta.env.DEV ? "./migrations" : MIGRATIONS_DIR;
  const migrations = (await Array.fromAsync(glob.scan(dir))).sort();

  await db`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `;

  const [[version]] = await db<[[number | null]]>`
    SELECT MAX(id) version
    FROM schema_migrations;
  `.values();

  const start = version ?? 0;
  for (let i = start; i < migrations.length; i++) {
    const migration = migrations[i];
    const [migrationName] = migration.split(".sql");
    const migrationContent = await Bun.file(dir + "/" + migration).text();

    try {
      await db.unsafe(migrationContent);
    } catch (error) {
      console.error(`Error running migration "${migrationName}"`);
      throw error;
    }
    await db`
      INSERT INTO schema_migrations (name)
      VALUES (${migrationName});
    `;
  }
}
