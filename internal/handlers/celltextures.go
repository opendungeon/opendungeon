package handlers

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"image/png"
	"io"
	"net/http"
	"os"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
	"github.com/opendungeon/opendungeon/internal/repository"
	"github.com/opendungeon/opendungeon/models"
	"modernc.org/sqlite"
	sqlite3 "modernc.org/sqlite/lib"
)

const (
	CellTextureWidth  = 32
	CellTextureHeight = 32
)

func CreateCellTexture(
	ctx context.Context,
	conn *sql.Conn,
	storageDir *os.Root,
	key, displayName string,
	content io.Reader,
) (models.CellTexture, error) {
	if len(key) < 3 || 64 < len(key) {
		return models.CellTexture{}, fiber.NewError(http.StatusBadRequest, "Key must be between 3 and 64 (inclusive) characters in length.")
	}

	if len(displayName) < 3 || 64 < len(displayName) {
		return models.CellTexture{}, fiber.NewError(http.StatusBadRequest, "Display name must be between 3 and 64 (inclusive) characters in length.")
	}

	img, err := png.Decode(content)
	if err != nil {
		return models.CellTexture{}, fiber.NewError(http.StatusUnsupportedMediaType, "Image must be a PNG format.")
	}

	rect := img.Bounds()
	width := rect.Max.X
	height := rect.Max.Y
	if width != CellTextureWidth || height != CellTextureHeight {
		message := fmt.Sprintf("Image must have a width of %d pixels and a height of %d pixels.", CellTextureWidth, CellTextureHeight)
		return models.CellTexture{}, fiber.NewError(http.StatusBadRequest, message)
	}

	repo := repository.New(conn)
	created, err := repo.CreateCellTexture(ctx, repository.CreateCellTextureParams{
		Key:         key,
		DisplayName: displayName,
	})
	if err != nil {
		sqlErr := new(sqlite.Error)
		if errors.As(err, &sqlErr) {
			if sqlErr.Code() == sqlite3.SQLITE_CONSTRAINT_UNIQUE {
				return models.CellTexture{}, fiber.NewError(fiber.StatusConflict, "Key already in use.")
			}
		}

		log.Errorf("failed to create cell texture record: %v", err)
		return models.CellTexture{}, fiber.NewError(http.StatusInternalServerError, "Failed to create texture record.")
	}

	// use a pipe to avoid creating another buffer
	pr, pw := io.Pipe()
	go func() {
		defer pw.Close()
		_ = png.Encode(pw, img) // know this wont error since we decoded from a PNG
	}()

	scopedKey := "celltexture." + created.Key
	fout, err := storageDir.Create(scopedKey)
	if err != nil {
		return models.CellTexture{}, fiber.NewError(http.StatusInternalServerError, "Failed to create file.")
	}

	if _, err := io.Copy(fout, pr); err != nil {
		// clean up db entry since the actual file didn't make it. ignore errors since we can't do anything about it.
		_, _ = repo.HardDeleteCellTexture(ctx, scopedKey)

		log.Errorf("failed to store cell texture: %v", err)
		return models.CellTexture{}, fiber.NewError(http.StatusInternalServerError, "Failed to store file.")
	}

	return models.RepoToCellTexture(created), nil
}

func GetCellTexture(
	ctx context.Context,
	conn *sql.Conn,
	storageDir *os.Root,
	key string,
) (io.ReadCloser, error) {
	repo := repository.New(conn)

	texture, err := repo.GetCellTexture(ctx, key)
	if err != nil {
		return nil, fiber.NewError(http.StatusNotFound, "Texture not found.")
	}

	scopedKey := "celltexture." + texture.Key
	fin, err := storageDir.Open(scopedKey)
	if err != nil {
		return nil, fiber.NewError(http.StatusInternalServerError, "Failed to retrieve file.")
	}

	return fin, nil
}

func ListCellTextures(
	ctx context.Context,
	conn *sql.Conn,
) ([]models.CellTexture, error) {
	repo := repository.New(conn)

	textures, err := repo.ListCellTextures(ctx)
	if err != nil {
		return nil, fiber.NewError(http.StatusInternalServerError, "Failed to list textures.")
	}

	// set to an empty list so we don't respond with `null`
	if textures == nil {
		return []models.CellTexture{}, nil
	}

	return models.RepoToCellTextures(textures), nil
}
