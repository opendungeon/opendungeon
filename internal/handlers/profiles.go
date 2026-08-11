package handlers

import (
	"context"
	"database/sql"
	"errors"
	"io"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/media"
	"github.com/opendungeon/opendungeon/internal/repository"
	"github.com/opendungeon/opendungeon/internal/storage"
	"github.com/opendungeon/opendungeon/models"
	"modernc.org/sqlite"
	sqlite3 "modernc.org/sqlite/lib"
)

func UpsertProfile(
	ctx context.Context,
	conn *sql.Conn,
	userID uuid.UUID,
	username string,
	avatar io.Reader,
) (models.Profile, error) {
	repo := repository.New(conn)

	avatarID := uuid.New()
	if avatar != nil {
		converted, err := media.ConvertToAvatar(avatar)
		if err != nil {
			if errors.Is(err, media.ErrUnknownContentType) || errors.Is(err, media.ErrUnsupportedImageFormat) {
				return models.Profile{}, fiber.NewError(fiber.StatusBadRequest, "Invalid avatar format. Must be a PNG, JPEG, HEIC, or WEBP.")
			}

			log.Errorf("failed to convert avatar: %v", err)
			return models.Profile{}, fiber.NewError(fiber.StatusInternalServerError, "Failed to convert avatar.")
		}

		fout, err := storage.Create(avatarID.String())
		if err != nil {
			return models.Profile{}, fiber.NewError(fiber.StatusInternalServerError, "Failed to create avatar.")
		}
		defer fout.Close()

		size, err := io.Copy(fout, converted)
		if err != nil {
			return models.Profile{}, fiber.NewError(fiber.StatusInternalServerError, "Failed to save avatar.")
		}

		_, err = repo.CreateMedia(ctx, repository.CreateMediaParams{
			Uuid:        avatarID,
			ContentType: "image/png",
			Size:        size,
			UserUuid:    userID,
		})
		if err != nil {
			_ = storage.Remove(avatarID.String())

			log.Errorf("failed to create media record: %v", err)
			return models.Profile{}, fiber.NewError(fiber.StatusInternalServerError, "Failed to save media.")
		}
	}

	upserted, err := repo.UpsertProfile(ctx, repository.UpsertProfileParams{
		UserUuid:   userID,
		Username:   username,
		AvatarUuid: avatarID,
	})
	if err != nil {
		_ = storage.Remove(avatarID.String())

		sqlErr := new(sqlite.Error)
		if errors.As(err, &sqlErr) {
			if sqlErr.Code() == sqlite3.SQLITE_CONSTRAINT_CHECK {
				return models.Profile{}, fiber.NewError(fiber.StatusBadRequest, "Invalid request.")
			}
		}

		log.Errorf("failed to upsert profile: %v", err)
		return models.Profile{}, fiber.NewError(fiber.StatusInternalServerError, "Failed to create profile.")
	}

	return models.RepoToProfile(upserted, avatarID), err
}

func GetProfile(ctx context.Context, conn *sql.Conn, userId uuid.UUID) (models.Profile, error) {
	repo := repository.New(conn)

	row, err := repo.GetProfile(ctx, userId)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return models.Profile{}, fiber.NewError(fiber.StatusNotFound, "Profile not found.")
		}

		log.Errorf("failed to get profile: %v", err)
		return models.Profile{}, fiber.NewError(fiber.StatusInternalServerError, "Failed to get profile.")
	}

	var avatar []uuid.UUID
	if row.AvatarUuid != nil {
		avatar = append(avatar, uuid.MustParse(string(row.AvatarUuid)))
	}

	return models.RepoToProfile(row.Profile, avatar...), nil
}
