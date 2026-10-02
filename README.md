# OpenDungeon

> An immersion first TTRPG environment

## Development

### Prerequisites

- [Docker Compose](https://github.com/docker/compose)
- [Bun](https://github.com/oven-sh/bun)

### Running the API Server

Create a `.env` file.

```sh
cp env.example .env
```

Start dependencies.

```sh
docker compose up -d
```

Run the server.

```sh
bun run dev

# to use websockets, full builds must be run

bun run ws
```

### Creating a Migration

Generate a migration file.

```sh
./scripts/create_migration.sh snake_case_migration_name
```

Populate the migration file (should be in `/migrations/`).

## Contributing

AI contributions are strictly forbidden. PRs that are clearly AI generated will be rejected and may result in permanent removal.

OpenDungeon is in early development and is not accepting outside contributions. Please open an issue if you have any concerns.

## Licensing

All code, unless otherwise noted, is licensed under [AGPL-3.0](https://github.com/opendungeon/opendungeon/blob/main/LICENSE).
