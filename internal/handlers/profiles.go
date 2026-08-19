package handlers

import (
	"context"
	"database/sql"
	"errors"
	"io"
	"log/slog"

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
				return models.Profile{}, ErrUnsupportedFormat
			}

			slog.Error("failed to convert avatar", "error", err)
			return models.Profile{}, ErrConvertFailure
		}

		fout, err := storage.Create(avatarID.String())
		if err != nil {
			return models.Profile{}, ErrStorageFailure
		}
		defer fout.Close()

		size, err := io.Copy(fout, converted)
		if err != nil {
			return models.Profile{}, ErrStorageFailure
		}

		_, err = repo.CreateMedia(ctx, repository.CreateMediaParams{
			Uuid:        avatarID,
			ContentType: "image/png",
			Size:        size,
			UserUuid:    userID,
		})
		if err != nil {
			_ = storage.Remove(avatarID.String())

			slog.Error("failed to create media record", "error", err)
			return models.Profile{}, ErrDatabaseFailure
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
				return models.Profile{}, ErrCheckViolation
			}
		}

		slog.Error("failed to upsert profile", "error", err)
		return models.Profile{}, ErrDatabaseFailure
	}

	return models.RepoToProfile(upserted, userID, &avatarID), err
}

func GetProfile(ctx context.Context, conn *sql.Conn, userID uuid.UUID) (models.Profile, error) {
	repo := repository.New(conn)

	row, err := repo.GetProfile(ctx, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return models.Profile{}, ErrNotFound
		}

		slog.Error("failed to get profile", "error", err)
		return models.Profile{}, ErrDatabaseFailure
	}

	var avatar *uuid.UUID
	if row.AvatarUuid != nil {
		avatarId := uuid.MustParse(string(row.AvatarUuid))
		avatar = &avatarId
	}

	return models.RepoToProfile(row.Profile, userID, avatar), nil
}

func ListGameProfiles(ctx context.Context, conn *sql.Conn, gameID uuid.UUID) ([]models.Profile, error) {
	repo := repository.New(conn)

	rows, err := repo.ListGameProfiles(ctx, gameID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return []models.Profile{}, nil
		}

		slog.Error("failed to get game profiles", "error", err)
		return nil, ErrDatabaseFailure
	}

	var profiles []models.Profile
	for _, row := range rows {
		var avatar *uuid.UUID
		if row.AvatarUuid != nil {
			avatarId := uuid.MustParse(string(row.AvatarUuid))
			avatar = &avatarId
		}
		profiles = append(profiles, models.RepoToProfile(row.Profile, row.UserUuid, avatar))
	}

	return profiles, nil
}
