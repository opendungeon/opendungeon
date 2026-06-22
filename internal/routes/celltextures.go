package routes

import (
	"net/http"

	"github.com/gofiber/fiber/v3"
	_ "github.com/opendungeon/opendungeon/internal/database"
	"github.com/opendungeon/opendungeon/internal/handlers"
)

// createCellTexture godoc
//
//	@Summary		Create cell texture
//	@Description	Create a new cell texture.
//	@Tags			CellTexture
//	@Accept			mpfd
//	@Produce		json
//	@Param			file	formData	file	true	"file"
//	@Success		201		{object}	database.CreateCellTextureRow		"Newly created texture details"
//	@Failure		400		{string}	string				"Bad request"
//	@Failure		415		{string}	string				"Unsupported media type"
//	@Failure		500		{string}	string				"Server error"
//	@Router			/api/cell-textures [post]
func createCellTexture(c fiber.Ctx) error {
	form, err := c.MultipartForm()
	if err != nil {
		return c.Status(http.StatusBadRequest).SendString("Invalid request body.")
	}

	keys, ok := form.Value["key"]
	if !ok || len(keys) < 1 {
		return c.Status(http.StatusBadRequest).SendString("Missing key.")
	}
	key := keys[0]

	displayNames, ok := form.Value["displayName"]
	if !ok || len(displayNames) < 1 {
		return c.Status(http.StatusBadRequest).SendString("Missing display name.")
	}
	displayName := displayNames[0]

	files, ok := form.File["file"]
	if !ok && len(files) < 1 {
		return c.Status(http.StatusBadRequest).SendString("Missing file.")
	}

	file, err := files[0].Open()
	if err != nil {
		return c.Status(http.StatusBadRequest).SendString("Failed to open form file.")
	}
	defer file.Close()

	dbSrv, err := getDBService(c)
	if err != nil {
		return err
	}

	storageSrv, err := getStorageService(c)
	if err != nil {
		return err
	}

	texture, err := handlers.CreateCellTexture(c, dbSrv, storageSrv, key, displayName, file)
	if err != nil {
		return err
	}

	return c.Status(http.StatusCreated).JSON(texture)
}
