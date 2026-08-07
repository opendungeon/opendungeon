package handlers

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/repository"
	"github.com/opendungeon/opendungeon/internal/services"
	"github.com/opendungeon/opendungeon/models"
	"github.com/opendungeon/opendungeon/pkg/grid"
	"modernc.org/sqlite"
	sqlite3 "modernc.org/sqlite/lib"
)

func CreateLevel(
	ctx context.Context,
	conn *sql.Conn,
	storage *services.Storage,
	userId uuid.UUID,
	name string,
	level grid.SerializedGrid,
) (models.Level, error) {
	var created models.Level

	levelId := uuid.New()

	buf := new(bytes.Buffer)
	if err := json.NewEncoder(buf).Encode(level); err != nil {
		return created, fiber.ErrBadRequest
	}

	scopedKey := "level." + levelId.String()
	_, err := storage.CreateFile(scopedKey, "application/json", buf)
	if err != nil {
		if errors.Is(err, services.ErrKeyInUse) {
			return created, fiber.ErrConflict
		}
		log.Errorf("failed to create file: %v", err)
		return created, fiber.ErrInternalServerError
	}

	repo := repository.New(conn)
	meta, err := repo.CreateLevel(ctx, repository.CreateLevelParams{
		Uuid:     levelId,
		Name:     name,
		UserUuid: userId,
	})
	if err != nil {
		_ = storage.DeleteFile(scopedKey)
		sqlErr := new(sqlite.Error)
		if errors.As(err, &sqlErr) {
			if sqlErr.Code() == sqlite3.SQLITE_CONSTRAINT_FOREIGNKEY {
				return created, fiber.ErrNotFound
			}
		}
		log.Errorf("failed to create level: %v", err)
		return created, fiber.ErrInternalServerError
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

		log.Errorf("failed to list levels: %v", err)
		return nil, fiber.ErrInternalServerError
	}

	if levels == nil {
		return []models.Level{}, nil
	}

	return models.RepoToLevelMetaDatas(levels), nil
}

func GetLevel(
	ctx context.Context,
	conn *sql.Conn,
	storage *services.Storage,
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
			return level, fiber.ErrNotFound
		}
		log.Errorf("failed to get level: %v", err)
		return level, fiber.ErrInternalServerError
	}

	scopedKey := "level." + meta.Uuid.String()
	file, err := storage.GetFile(scopedKey)
	if err != nil {
		log.Errorf("failed to get file: %v", err)
		return level, fiber.ErrInternalServerError
	}

	defer file.Close()

	var levelData grid.SerializedGrid
	if err := json.NewDecoder(file).Decode(&levelData); err != nil {
		log.Errorf("failed to decode level data: %v", err)
		return level, fiber.ErrInternalServerError
	}

	level.ID = meta.Uuid
	level.Name = meta.Name
	level.Data = &levelData
	return level, nil
}

func UpdateLevel(
	ctx context.Context,
	conn *sql.Conn,
	storage *services.Storage,
	userID, levelID uuid.UUID,
	name string,
	level grid.SerializedGrid,
) (models.Level, error) {
	var updated models.Level

	buf := new(bytes.Buffer)
	if err := json.NewEncoder(buf).Encode(level); err != nil {
		return updated, fiber.ErrBadRequest
	}

	scopedKey := "level." + levelID.String()
	_ = storage.DeleteFile(scopedKey)

	_, err := storage.CreateFile(scopedKey, "application/json", buf)
	if err != nil {
		log.Errorf("failed to create replacement in update level: %v", err)
		return updated, fiber.ErrInternalServerError
	}

	repo := repository.New(conn)
	meta, err := repo.UpdateLevel(ctx, repository.UpdateLevelParams{
		Name:      name,
		UserUuid:  userID,
		LevelUuid: levelID,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return updated, fiber.ErrNotFound
		}

		log.Errorf("failed to update level record: %v", err)
		return updated, fiber.ErrInternalServerError
	}

	updated.ID = meta.Uuid
	updated.Name = meta.Name
	updated.CreatedAt = meta.CreatedAt
	updated.UpdatedAt = meta.UpdatedAt
	updated.Data = &level
	return updated, nil
}
