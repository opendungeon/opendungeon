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
	"github.com/opendungeon/opendungeon/internal/media"
	"github.com/opendungeon/opendungeon/internal/repository"
	"github.com/opendungeon/opendungeon/models"
	"modernc.org/sqlite"
	sqlite3 "modernc.org/sqlite/lib"
)

type UpsertedProfile struct {
	Username string  `json:"username"`
	Avatar   *string `json:"avatar"`
}

func UpsertProfile(
	ctx context.Context,
	conn *sql.Conn,
	storageDir *os.Root,
	userId uuid.UUID,
	username string,
	avatar io.Reader,
) (models.Profile, error) {
	var avatarID *string
	if avatar != nil {
		converted, err := media.ConvertToAvatar(avatar)
		if err != nil {
			if errors.Is(err, media.ErrUnknownContentType) || errors.Is(err, media.ErrUnsupportedImageFormat) {
				return models.Profile{}, fiber.NewError(fiber.StatusBadRequest, "Invalid avatar format. Must be a PNG, JPEG, HEIC, or WEBP.")
			}

			log.Errorf("failed to convert avatar: %v", err)
			return models.Profile{}, fiber.NewError(fiber.StatusInternalServerError, "Failed to convert avatar.")
		}

		id := uuid.New()
		scopedKey := "avatar." + id.String()
		fout, err := storageDir.Create(scopedKey)
		if err != nil {
			return models.Profile{}, fiber.NewError(fiber.StatusInternalServerError, "Failed to create avatar.")
		}

		if _, err := io.Copy(fout, converted); err != nil {
			return models.Profile{}, fiber.NewError(fiber.StatusInternalServerError, "Failed to save avatar.")
		}

		idStr := id.String()
		avatarID = &idStr
	}

	repo := repository.New(conn)
	upserted, err := repo.UpsertProfile(ctx, repository.UpsertProfileParams{
		UserUuid: userId,
		Username: username,
		Avatar:   avatarID,
	})
	if err != nil {
		if avatarID != nil {
			scopedKey := "avatar." + *avatarID
			_ = storageDir.Remove(scopedKey)
		}

		sqlErr := new(sqlite.Error)
		if errors.As(err, &sqlErr) {
			if sqlErr.Code() == sqlite3.SQLITE_CONSTRAINT_CHECK {
				return models.Profile{}, fiber.NewError(fiber.StatusBadRequest, "Invalid request.")
			}
		}
		return models.Profile{}, fiber.NewError(fiber.StatusInternalServerError, "Failed to create profile.")
	}

	return models.RepoToProfile(upserted), err
}

func GetProfile(ctx context.Context, conn *sql.Conn, userId uuid.UUID) (models.Profile, error) {
	repo := repository.New(conn)

	profile, err := repo.GetProfile(ctx, userId)
	if err != nil {
		return models.Profile{}, fiber.NewError(fiber.StatusNotFound, "Profile not found.")
	}

	return models.RepoToProfile(profile), nil
}
