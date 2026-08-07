package router

import (
	"net/http"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
	"github.com/opendungeon/opendungeon/internal/handlers"
)

// createCellTexture
//
//	@Summary		Create cell texture
//	@Description	Create a new cell texture.
//	@Tags			Cell Textures
//	@Accept			mpfd
//	@Produce		json
//	@Param			key			formData	string							true	"Texture key"
//	@Param			displayName	formData	string							true	"Texture display name"
//	@Param			file		formData	file							true	"64x64 image file"
//	@Success		201			{object}	database.CreateCellTextureRow	"Newly created texture details"
//	@Failure		400			{string}	string							"Bad request"
//	@Failure		415			{string}	string							"Unsupported media type"
//	@Failure		500			{string}	string							"Server error"
//	@Router			/api/cell-textures [post]
func (r *router) createCellTexture(c fiber.Ctx) error {
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

	db, err := r.db.DB.Conn(c.Context())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to connect to database.")
	}
	defer db.Close()

	texture, err := handlers.CreateCellTexture(c, db, r.storage, key, displayName, file)
	if err != nil {
		return err
	}

	return c.Status(http.StatusCreated).JSON(texture)
}

// getCellTexture
//
//	@Summary		Get cell texture
//	@Description	Get an existing cell texture.
//	@Tags			Cell Textures
//	@Produce		image/png
//	@Param			key	path		string	true	"Key"
//	@Success		200	{file}		binary	"Texture content"
//	@Failure		400	{string}	string	"Bad request"
//	@Failure		404	{string}	string	"Not found"
//	@Failure		500	{string}	string	"Server error"
//	@Router			/api/cell-textures/{key} [get]
func (r *router) getCellTexture(c fiber.Ctx) error {
	key := c.Params("key")

	db, err := r.db.DB.Conn(c.Context())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to connect to database.")
	}
	defer db.Close()

	texture, err := handlers.GetCellTexture(c, db, r.storage, key)
	if err != nil {
		return err
	}

	c.Set("Content-Type", "image/png")
	return c.SendStream(texture)
}

// listCellTextures
//
//	@Summary		List cell textures
//	@Description	List all existing cell textures.
//	@Tags			Cell Textures
//	@Produce		json
//	@Success		200	{object}	[]database.ListCellTexturesRow	"List of cell textures"
//	@Failure		500	{string}	string							"Server error"
//	@Router			/api/cell-textures [get]
func (r *router) listCellTextures(c fiber.Ctx) error {
	db, err := r.db.DB.Conn(c.Context())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to connect to database.")
	}
	defer db.Close()

	textures, err := handlers.ListCellTextures(c, db)
	if err != nil {
		return err
	}

	return c.JSON(textures)
}
