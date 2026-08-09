package handlers

import (
	"context"
	"database/sql"
	"errors"
	"io"
	"os"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/repository"
	"github.com/opendungeon/opendungeon/models"
)

func GetMedia(ctx context.Context, conn *sql.Conn, id uuid.UUID) (models.Media, error) {
	repo := repository.New(conn)

	media, err := repo.GetMedia(ctx, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return models.Media{}, fiber.NewError(fiber.StatusNotFound, "Media not found.")
		}

		log.Errorf("failed to get media: %v", err)
		return models.Media{}, fiber.NewError(fiber.StatusInternalServerError, "Failed to get media.")
	}

	return models.RepoToMedia(media), nil
}

func GetMediaContent(ctx context.Context, storageDir *os.Root, id uuid.UUID) (io.ReadCloser, error) {
	fin, err := storageDir.Open(id.String())
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, fiber.NewError(fiber.StatusNotFound, "Media not found.")
		}

		log.Errorf("failed to get media: %v", err)
		return nil, fiber.NewError(fiber.StatusInternalServerError, "Failed to get media.")
	}

	return fin, nil
}
