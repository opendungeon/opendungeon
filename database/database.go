package database

import (
	"context"
	"database/sql"
	"errors"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/sqlite"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/opendungeon/opendungeon/database/migrations"
	_ "modernc.org/sqlite"
)

var db *sql.DB

func Init(dbPath string) error {
	var err error

	db, err = sql.Open("sqlite", dbPath)
	if err != nil {
		return err
	}

	if err := runMigrations(db); err != nil {
		return err
	}

	return nil
}

func Close() error {
	return db.Close()
}

func Connect(ctx context.Context) (*sql.Conn, error) {
	return db.Conn(ctx)
}

func runMigrations(db *sql.DB) error {
	source, err := iofs.New(migrations.FS, ".")
	if err != nil {
		return err
	}

	driver, err := sqlite.WithInstance(db, &sqlite.Config{
		NoTxWrap: true,
	})
	if err != nil {
		return err
	}

	migrator, err := migrate.NewWithInstance("sqlite", source, "", driver)
	if err != nil {
		return err
	}

	if err := migrator.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return err
	}

	return nil
}
