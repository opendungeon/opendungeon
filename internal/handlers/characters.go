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

func UpsertCharacter(
	ctx context.Context,
	conn *sql.Conn,
	userID uuid.UUID,
	characterID uuid.UUID,
	name string,
	characterModel io.Reader,
) (models.Level, error) {
	var created models.Level

	mediaID := uuid.New()
	fout, err := storage.Create(mediaID.String())
	if err != nil {
		slog.Error("failed to create file", "error", err)
		return created, ErrStorageFailure
	}

	size, err := io.Copy(fout, characterModel)
	if err != nil {
		slog.Error("failed to write file", "error", err)
		return created, ErrStorageFailure
	}

	repo := repository.New(conn)

	_, err = repo.CreateMedia(ctx, repository.CreateMediaParams{
		Uuid:        mediaID,
		ContentType: "model/gltf+json",
		Size:        size,
		UserUuid:    userID,
	})
	if err != nil {
		_ = storage.Remove(mediaID.String())

		slog.Error("failed to create media record", "error", err)
		return created, ErrDatabaseFailure
	}

	meta, err := repo.UpsertCharacter(ctx, repository.UpsertCharacterParams{
		Uuid:      characterID,
		Name:      name,
		MediaUuid: mediaID,
		UserUuid:  userID,
	})
	if err != nil {
		_ = storage.Remove(mediaID.String())

		sqlErr := new(sqlite.Error)
		if errors.As(err, &sqlErr) {
			if sqlErr.Code() == sqlite3.SQLITE_CONSTRAINT_FOREIGNKEY {
				return created, ErrForeignKeyViolation
			}
		}
		slog.Error("failed to create level", "error", err)
		return created, ErrDatabaseFailure
	}

	created.ID = meta.Uuid
	created.Name = meta.Name
	created.CreatedAt = meta.CreatedAt
	created.UpdatedAt = meta.UpdatedAt
	return created, nil
}

func ListCharacters(
	ctx context.Context,
	conn *sql.Conn,
	userId uuid.UUID,
) ([]models.Character, error) {
	repo := repository.New(conn)

	characters, err := repo.ListCharacters(ctx, userId)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return []models.Character{}, nil
		}

		slog.Error("failed to list levels", "error", err)
		return nil, ErrDatabaseFailure
	}

	if characters == nil {
		return []models.Character{}, nil
	}

	return models.RepoToCharacters(characters), nil
}
