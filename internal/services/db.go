package services

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/sqlite"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/opendungeon/opendungeon/database/migrations"
	"github.com/opendungeon/opendungeon/internal/database"
	_ "modernc.org/sqlite"
)

const DBName = "sqlite"

type DB struct {
	DB      *sql.DB
	Queries *database.Queries
}

func NewDB(dbPath string) (*DB, error) {
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, err
	}

	return &DB{DB: db}, nil
}

func (d *DB) Start(ctx context.Context) error {
	source, err := iofs.New(migrations.FS, ".")
	if err != nil {
		return err
	}

	driver, err := sqlite.WithInstance(d.DB, &sqlite.Config{
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

	d.Queries = database.New(d.DB)
	return nil
}

func (d *DB) String() string {
	return DBName
}

func (d *DB) State(ctx context.Context) (string, error) {
	stats := d.DB.Stats()
	state := fmt.Sprintf("Active connections: %d, Idle connections: %d", stats.InUse, stats.Idle)
	return state, nil
}

func (d *DB) Terminate(ctx context.Context) error {
	return d.DB.Close()
}
