package handlers

import (
	"context"
	"database/sql"
	"errors"
	"image/png"
	"io"
	"log/slog"

	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/repository"
	"github.com/opendungeon/opendungeon/internal/storage"
	"github.com/opendungeon/opendungeon/models"
	"modernc.org/sqlite"
	sqlite3 "modernc.org/sqlite/lib"
)

const (
	CellTextureWidth  = 64
	CellTextureHeight = 64
)

func CreateCellTexture(
	ctx context.Context,
	conn *sql.Conn,
	userID uuid.UUID,
	key, displayName string,
	content io.Reader,
) (models.CellTexture, error) {
	if len(key) < 3 || 64 < len(key) {
		return models.CellTexture{}, ErrValidationFailure
	}

	if len(displayName) < 3 || 64 < len(displayName) {
		return models.CellTexture{}, ErrValidationFailure
	}

	img, err := png.Decode(content)
	if err != nil {
		return models.CellTexture{}, ErrUnsupportedFormat
	}

	rect := img.Bounds()
	width := rect.Max.X
	height := rect.Max.Y
	if width != CellTextureWidth || height != CellTextureHeight {
		return models.CellTexture{}, ErrValidationFailure
	}

	// use a pipe to avoid creating another buffer
	pr, pw := io.Pipe()
	go func() {
		defer pw.Close()
		_ = png.Encode(pw, img) // know this wont error since we decoded from a PNG
	}()

	mediaID := uuid.New()
	fout, err := storage.Create(mediaID.String())
	if err != nil {
		return models.CellTexture{}, ErrDatabaseFailure
	}

	size, err := io.Copy(fout, pr)
	if err != nil {
		slog.Error("failed to store cell texture", "error", err)
		return models.CellTexture{}, ErrStorageFailure
	}

	repo := repository.New(conn)

	_, err = repo.CreateMedia(ctx, repository.CreateMediaParams{
		Uuid:        mediaID,
		ContentType: "image/png",
		Size:        size,
		UserUuid:    userID,
	})
	if err != nil {
		_ = storage.Remove(mediaID.String())

		slog.Error("failed to create media record", "error", err)
		return models.CellTexture{}, ErrDatabaseFailure
	}

	created, err := repo.CreateCellTexture(ctx, repository.CreateCellTextureParams{
		Key:         key,
		DisplayName: displayName,
		MediaUuid:   mediaID,
	})
	if err != nil {
		_ = storage.Remove(mediaID.String())

		sqlErr := new(sqlite.Error)
		if errors.As(err, &sqlErr) {
			if sqlErr.Code() == sqlite3.SQLITE_CONSTRAINT_UNIQUE {
				return models.CellTexture{}, ErrUniqueViolation
			}
		}

		slog.Error("failed to create cell texture record", "error", err)
		return models.CellTexture{}, ErrDatabaseFailure
	}

	return models.RepoToCellTexture(created), nil
}

func ListCellTextures(
	ctx context.Context,
	conn *sql.Conn,
) ([]models.CellTexture, error) {
	repo := repository.New(conn)

	row, err := repo.ListCellTextures(ctx)
	if err != nil {
		slog.Error("failed to list textures", "error", err)
		return nil, ErrDatabaseFailure
	}

	// set to an empty list so we don't respond with `null`
	if row == nil {
		return []models.CellTexture{}, nil
	}

	return models.RepoToCellTextures(row), nil
}
