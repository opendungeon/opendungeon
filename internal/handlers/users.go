package handlers

import (
	"context"
	"database/sql"
	"errors"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/database"
	"github.com/opendungeon/opendungeon/internal/services"
)

func GetUser(ctx context.Context, db *services.DB, userID uuid.UUID) (database.GetUserRow, error) {
	user, err := db.Queries.GetUser(ctx, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return user, fiber.ErrNotFound
		}

		log.Errorf("failed to get user: %v", err)
		return user, fiber.ErrInternalServerError
	}

	return user, nil
}
