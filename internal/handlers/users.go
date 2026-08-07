package handlers

import (
	"context"
	"database/sql"
	"errors"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/repository"
	"github.com/opendungeon/opendungeon/models"
)

func GetUser(ctx context.Context, conn *sql.Conn, userID uuid.UUID) (models.User, error) {
	repo := repository.New(conn)
	user, err := repo.GetUser(ctx, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return models.User{}, fiber.ErrNotFound
		}

		log.Errorf("failed to get user: %v", err)
		return models.User{}, fiber.ErrInternalServerError
	}

	return models.RepoToUser(user), nil
}
