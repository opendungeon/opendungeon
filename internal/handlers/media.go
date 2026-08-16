package handlers

import (
	"context"
	"database/sql"
	"errors"
	"io"
	"log/slog"
	"os"

	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/repository"
	"github.com/opendungeon/opendungeon/internal/storage"
	"github.com/opendungeon/opendungeon/models"
)

func GetMedia(ctx context.Context, conn *sql.Conn, id uuid.UUID) (models.Media, error) {
	repo := repository.New(conn)

	media, err := repo.GetMedia(ctx, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return models.Media{}, ErrNotFound
		}

		slog.Error("failed to get media", "error", err)
		return models.Media{}, ErrDatabaseFailure
	}

	return models.RepoToMedia(media), nil
}

func GetMediaContent(ctx context.Context, id uuid.UUID) (io.ReadCloser, error) {
	fin, err := storage.Open(id.String())
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, ErrNotFound
		}

		slog.Error("failed to get media", "error", err)
		return nil, ErrDatabaseFailure
	}

	return fin, nil
}
