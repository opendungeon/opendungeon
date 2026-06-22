# OpenDungeon

> An immersion first TTRPG environment

## Development

### Prerequisites

- [Migrate](https://github.com/golang-migrate/migrate)
- [sqlc](https://github.com/sqlc-dev/sqlc)
- [Air](https://github.com/air-verse/air) (optional, used for hot reloading)

### Running the API Server

Create a `.env` file.

```sh
cp env.template .env
```

Generate database handlers.

```sh
sqlc generate
```

Run the server.

```sh
make run

# OR use air for hot reloading

air
```

### Creating a Migration

Generate migration files.

```sh
migrate create -dir database/migrations -ext sql snake_case_migration_name
```

Populate the migration files (should be in `/database/migrations/`). Be sure to fill out the `down` migration!

## Contributing

OpenDungeon is in early development and is not accepting outside contributions. Please open an issue if you have any concerns.

## Licensing

All code, unless otherwise noted, is licensed under [AGPL-3.0](https://github.com/opendungeon/opendungeon/blob/main/LICENSE).
