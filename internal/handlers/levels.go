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
	"github.com/opendungeon/opendungeon/internal/database"
	"github.com/opendungeon/opendungeon/internal/services"
	"github.com/opendungeon/opendungeon/pkg/grid"
	"modernc.org/sqlite"
	sqlite3 "modernc.org/sqlite/lib"
)

func CreateLevel(
	ctx context.Context,
	db *services.DB,
	storage *services.Storage,
	userId uuid.UUID,
	name string,
	level grid.SerializedGrid,
) (database.CreateLevelRow, error) {
	levelId := uuid.New()

	buf := new(bytes.Buffer)
	if err := json.NewEncoder(buf).Encode(level); err != nil {
		return database.CreateLevelRow{}, fiber.ErrBadRequest
	}

	scopedKey := "level." + levelId.String()
	_, err := storage.CreateFile(scopedKey, "application/json", buf)
	if err != nil {
		if errors.Is(err, services.ErrKeyInUse) {
			return database.CreateLevelRow{}, fiber.ErrConflict
		}
		log.Errorf("failed to create file: %v", err)
		return database.CreateLevelRow{}, fiber.ErrInternalServerError
	}

	created, err := db.Queries.CreateLevel(ctx, database.CreateLevelParams{
		Uuid:     levelId,
		Name:     name,
		UserUuid: userId,
	})
	if err != nil {
		_ = storage.DeleteFile(scopedKey)
		sqlErr := new(sqlite.Error)
		if errors.As(err, &sqlErr) {
			if sqlErr.Code() == sqlite3.SQLITE_CONSTRAINT_FOREIGNKEY {
				return database.CreateLevelRow{}, fiber.ErrNotFound
			}
		}
		log.Errorf("failed to create level: %v", err)
		return database.CreateLevelRow{}, fiber.ErrInternalServerError
	}

	return created, nil
}

func ListLevels(
	ctx context.Context,
	db *services.DB,
	userId uuid.UUID,
) ([]database.ListLevelsRow, error) {
	levels, err := db.Queries.ListLevels(ctx, userId)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return []database.ListLevelsRow{}, nil
		}
		log.Errorf("failed to list levels: %v", err)
		return nil, fiber.ErrInternalServerError
	}

	return levels, nil
}

func GetLevel(
	ctx context.Context,
	db *services.DB,
	storage *services.Storage,
	userId uuid.UUID,
	levelId uuid.UUID,
) (grid.SerializedGrid, error) {
	level, err := db.Queries.GetLevel(ctx, database.GetLevelParams{
		LevelUuid: levelId,
		UserUuid:  userId,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return grid.SerializedGrid{}, fiber.ErrNotFound
		}
		log.Errorf("failed to get level: %v", err)
		return grid.SerializedGrid{}, fiber.ErrInternalServerError
	}

	scopedKey := "level." + level.Uuid.String()
	file, err := storage.GetFile(scopedKey)
	if err != nil {
		log.Errorf("failed to get file: %v", err)
		return grid.SerializedGrid{}, fiber.ErrInternalServerError
	}

	defer file.Close()

	var levelData grid.SerializedGrid
	if err := json.NewDecoder(file).Decode(&levelData); err != nil {
		log.Errorf("failed to decode level data: %v", err)
		return grid.SerializedGrid{}, fiber.ErrInternalServerError
	}

	return levelData, nil
}
