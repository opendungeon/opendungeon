package handlers

import (
	"context"
	"errors"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/database"
	"github.com/opendungeon/opendungeon/internal/services"
	"modernc.org/sqlite"
	sqlite3 "modernc.org/sqlite/lib"
)

type UpsertedProfile struct {
	Username string  `json:"username"`
	Avatar   *string `json:"avatar"`
}

func UpsertProfile(ctx context.Context, db *services.DB, userId uuid.UUID, profile UpsertedProfile) (database.UpsertProfileRow, error) {
	upserted, err := db.Queries.UpsertProfile(ctx, database.UpsertProfileParams{
		UserUuid: userId,
		Username: profile.Username,
		Avatar:   profile.Avatar,
	})
	if err != nil {
		sqlErr := new(sqlite.Error)
		if errors.As(err, &sqlErr) {
			if sqlErr.Code() == sqlite3.SQLITE_CONSTRAINT_CHECK {
				return database.UpsertProfileRow{}, fiber.NewError(fiber.StatusBadRequest, "Invalid request.")
			}
		}
		return database.UpsertProfileRow{}, fiber.NewError(fiber.StatusInternalServerError, "Failed to create profile.")
	}

	return upserted, err
}
