package handlers

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"

	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/repository"
	"github.com/opendungeon/opendungeon/models"
)

func GetUser(ctx context.Context, conn *sql.Conn, userID uuid.UUID) (models.User, error) {
	repo := repository.New(conn)
	user, err := repo.GetUser(ctx, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return models.User{}, ErrNotFound
		}

		slog.Error("failed to get user", "error", err)
		return models.User{}, ErrDatabaseFailure
	}

	return models.RepoToUser(user), nil
}
