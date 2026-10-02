package handlers

import (
	"context"
	"database/sql"
	"errors"
	"io"
	"log/slog"
	"uuid"

	"github.com/opendungeon/opendungeon/internal/repository"
	"github.com/opendungeon/opendungeon/internal/storage"
	"github.com/opendungeon/opendungeon/models"
	"modernc.org/sqlite"
	sqlite3 "modernc.org/sqlite/lib"
)

func CreateDecoration(
	ctx context.Context,
	conn *sql.Conn,
	userID uuid.UUID,
	key, displayName string,
	decorationModel io.Reader,
) (models.Decoration, error) {
	if len(key) < 3 || 64 < len(key) {
		return models.Decoration{}, ErrValidationFailure
	}

	if len(displayName) < 3 || 64 < len(displayName) {
		return models.Decoration{}, ErrValidationFailure
	}

	mediaID := uuid.New()
	fout, err := storage.Create(mediaID.String())
	if err != nil {
		return models.Decoration{}, ErrDatabaseFailure
	}

	size, err := io.Copy(fout, decorationModel)
	if cerr := fout.Close(); err == nil {
		err = cerr
	}
	if err != nil {
		_ = storage.Remove(mediaID.String())

		slog.Error("failed to store decoration", "error", err)
		return models.Decoration{}, ErrStorageFailure
	}

	repo := repository.New(conn)

	_, err = repo.CreateMedia(ctx, repository.CreateMediaParams{
		Uuid:        mediaID,
		ContentType: "model/gltf-binary",
		Size:        size,
		UserUuid:    userID,
	})
	if err != nil {
		_ = storage.Remove(mediaID.String())

		slog.Error("failed to create media record", "error", err)
		return models.Decoration{}, ErrDatabaseFailure
	}

	created, err := repo.CreateDecoration(ctx, repository.CreateDecorationParams{
		Key:         key,
		DisplayName: displayName,
		MediaUuid:   mediaID,
	})
	if err != nil {
		_ = storage.Remove(mediaID.String())

		sqlErr := new(sqlite.Error)
		if errors.As(err, &sqlErr) {
			if sqlErr.Code() == sqlite3.SQLITE_CONSTRAINT_UNIQUE {
				return models.Decoration{}, ErrUniqueViolation
			}
		}

		slog.Error("failed to create decoration", "error", err)
		return models.Decoration{}, ErrDatabaseFailure
	}

	return models.RepoToDecoration(created), nil
}

func ListDecorations(
	ctx context.Context,
	conn *sql.Conn,
) ([]models.Decoration, error) {
	repo := repository.New(conn)

	row, err := repo.ListDecorations(ctx)
	if err != nil {
		slog.Error("failed to list decorations", "error", err)
		return nil, ErrDatabaseFailure
	}

	// set to an empty list so we don't respond with `null`
	if row == nil {
		return []models.Decoration{}, nil
	}

	return models.RepoToDecorations(row), nil
}
