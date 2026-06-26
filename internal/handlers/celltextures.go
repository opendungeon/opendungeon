package handlers

import (
	"context"
	"fmt"
	"image/png"
	"io"
	"net/http"

	"github.com/gofiber/fiber/v3"
	"github.com/opendungeon/opendungeon/internal/database"
	"github.com/opendungeon/opendungeon/internal/services"
)

const (
	CellTextureWidth  = 128
	CellTextureHeight = 64
)

func CreateCellTexture(
	ctx context.Context,
	db *services.DB,
	storage *services.Storage,
	key, displayName string,
	content io.Reader,
) (database.CreateCellTextureRow, error) {
	var created database.CreateCellTextureRow

	if len(key) < 3 || 64 < len(key) {
		return created, fiber.NewError(http.StatusBadRequest, "Key must be between 3 and 64 (inclusive) characters in length.")
	}

	if len(displayName) < 3 || 64 < len(displayName) {
		return created, fiber.NewError(http.StatusBadRequest, "Display name must be between 3 and 64 (inclusive) characters in length.")
	}

	img, err := png.Decode(content)
	if err != nil {
		return created, fiber.NewError(http.StatusUnsupportedMediaType, "Image must be a PNG format.")
	}

	rect := img.Bounds()
	width := rect.Max.X
	height := rect.Max.Y
	if width != CellTextureWidth || height != CellTextureHeight {
		message := fmt.Sprintf("Image must have a width of %d pixels and a height of %d pixels.", CellTextureWidth, CellTextureHeight)
		return created, fiber.NewError(http.StatusBadRequest, message)
	}

	created, err = db.Queries.CreateCellTexture(ctx, database.CreateCellTextureParams{
		Key:         key,
		DisplayName: displayName,
	})
	if err != nil {
		// TODO: log something
		return created, fiber.NewError(http.StatusInternalServerError, "Failed to create texture record.")
	}

	// use a pipe to avoid creating another buffer
	pr, pw := io.Pipe()
	go func() {
		defer pw.Close()
		_ = png.Encode(pw, img) // know this wont error since we decoded from a PNG
	}()

	scopedKey := "celltexture." + created.Key
	if _, err := storage.CreateFile(scopedKey, "image/png", pr); err != nil {
		// TODO: log something

		// clean up db entry since the actual file didn't make it. ignore errors since we can't do anything about it.
		_, _ = db.Queries.HardDeleteCellTexture(ctx, scopedKey)
		return created, fiber.NewError(http.StatusInternalServerError, "Failed to store file.")
	}

	return created, nil
}

func GetCellTexture(
	ctx context.Context,
	db *services.DB,
	storage *services.Storage,
	key string,
) (io.ReadCloser, error) {
	texture, err := db.Queries.GetCellTexture(ctx, key)
	if err != nil {
		return nil, fiber.NewError(http.StatusNotFound, "Texture not found.")
	}

	scopedKey := "celltexture." + texture.Key
	reader, err := storage.GetFile(scopedKey)
	if err != nil {
		return nil, fiber.NewError(http.StatusInternalServerError, "Failed to retrieve file.")
	}

	return reader, nil
}

func ListCellTextures(
	ctx context.Context,
	db *services.DB,
) ([]database.ListCellTexturesRow, error) {
	textures, err := db.Queries.ListCellTextures(ctx)
	if err != nil {
		return nil, fiber.NewError(http.StatusInternalServerError, "Failed to list textures.")
	}

	// set to an empty list so we don't respond with `null`
	if textures == nil {
		textures = []database.ListCellTexturesRow{}
	}

	return textures, nil
}
