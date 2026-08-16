package handlers

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"log/slog"

	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/repository"
	"github.com/opendungeon/opendungeon/internal/storage"
	"github.com/opendungeon/opendungeon/models"
	"github.com/opendungeon/opendungeon/pkg/grid"
	"modernc.org/sqlite"
	sqlite3 "modernc.org/sqlite/lib"
)

func CreateLevel(
	ctx context.Context,
	conn *sql.Conn,
	userID uuid.UUID,
	name string,
	level grid.SerializedGrid,
) (models.Level, error) {
	var created models.Level

	levelId := uuid.New()

	buf := new(bytes.Buffer)
	if err := json.NewEncoder(buf).Encode(level); err != nil {
		return created, ErrInvalidRequestFormat
	}

	mediaID := uuid.New()
	fout, err := storage.Create(mediaID.String())
	if err != nil {
		slog.Error("failed to create file", "error", err)
		return created, ErrStorageFailure
	}

	size, err := io.Copy(fout, buf)
	if err != nil {
		slog.Error("failed to write file", "error", err)
		return created, ErrStorageFailure
	}

	repo := repository.New(conn)

	_, err = repo.CreateMedia(ctx, repository.CreateMediaParams{
		Uuid:        mediaID,
		ContentType: "application/json",
		Size:        size,
		UserUuid:    userID,
	})
	if err != nil {
		_ = storage.Remove(mediaID.String())

		slog.Error("failed to create media record", "error", err)
		return created, ErrDatabaseFailure
	}

	meta, err := repo.CreateLevel(ctx, repository.CreateLevelParams{
		Uuid:      levelId,
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
	created.Data = &level
	return created, nil
}

func ListLevels(
	ctx context.Context,
	conn *sql.Conn,
	userId uuid.UUID,
) ([]models.Level, error) {
	repo := repository.New(conn)

	levels, err := repo.ListLevels(ctx, userId)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return []models.Level{}, nil
		}

		slog.Error("failed to list levels", "error", err)
		return nil, ErrDatabaseFailure
	}

	if levels == nil {
		return []models.Level{}, nil
	}

	return models.RepoToLevelMetaDatas(levels), nil
}

func GetLevel(
	ctx context.Context,
	conn *sql.Conn,
	userId uuid.UUID,
	levelId uuid.UUID,
) (models.Level, error) {
	var level models.Level

	repo := repository.New(conn)
	meta, err := repo.GetLevel(ctx, repository.GetLevelParams{
		LevelUuid: levelId,
		UserUuid:  userId,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return level, ErrNotFound
		}
		slog.Error("failed to get level", "error", err)
		return level, ErrDatabaseFailure
	}

	fin, err := storage.Open(meta.Medium.Uuid.String())
	if err != nil {
		slog.Error("failed to get file", "error", err)
		return level, ErrStorageFailure
	}
	defer fin.Close()

	var levelData grid.SerializedGrid
	if err := json.NewDecoder(fin).Decode(&levelData); err != nil {
		slog.Error("failed to decode level data", "error", err)
		return level, ErrStorageFailure
	}

	level.ID = meta.Level.Uuid
	level.Name = meta.Level.Name
	level.Data = &levelData
	return level, nil
}

func UpdateLevel(
	ctx context.Context,
	conn *sql.Conn,
	userID, levelID uuid.UUID,
	name string,
	levelData grid.SerializedGrid,
) (models.Level, error) {
	var updated models.Level

	buf := new(bytes.Buffer)
	if err := json.NewEncoder(buf).Encode(levelData); err != nil {
		return updated, ErrInvalidRequestFormat
	}

	repo := repository.New(conn)
	level, err := repo.GetLevel(ctx, repository.GetLevelParams{
		LevelUuid: levelID,
		UserUuid:  userID,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return updated, ErrNotFound
		}

		slog.Error("failed to get level", "error", err)
		return updated, ErrDatabaseFailure
	}

	_ = storage.Remove(level.Medium.Uuid.String())
	fout, err := storage.Create(level.Medium.Uuid.String())
	if err != nil {
		slog.Error("failed to create replacement in update level", "error", err)
		return updated, ErrDatabaseFailure
	}

	if _, err := io.Copy(fout, buf); err != nil {
		slog.Error("failed to write replacement in update level", "error", err)
		return updated, ErrDatabaseFailure
	}

	meta, err := repo.UpdateLevel(ctx, repository.UpdateLevelParams{
		Name:      name,
		UserUuid:  userID,
		LevelUuid: levelID,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return updated, ErrNotFound
		}

		slog.Error("failed to update level record", "error", err)
		return updated, ErrDatabaseFailure
	}

	updated.ID = meta.Uuid
	updated.Name = meta.Name
	updated.CreatedAt = meta.CreatedAt
	updated.UpdatedAt = meta.UpdatedAt
	updated.Data = &levelData
	return updated, nil
}
