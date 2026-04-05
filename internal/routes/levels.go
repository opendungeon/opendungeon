package routes

import (
	"bytes"
	"io"
	"net/http"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/pkg/grid"
)

// createLevel godoc
//
//	@Summary		Create level
//	@Description	Create a new level.
//	@Tags			Level
//	@Accept			json
//	@Produce		json
//	@Param			request	body		grid.SerializedGrid	true	"Level details"
//	@Success		201		{object}	services.FileMetadata		"Newly created level file"
//	@Failure		400		{string}	string				"Bad request"
//	@Failure		500		{string}	string				"Server error"
//	@Router			/api/levels [post]
func createLevel(c fiber.Ctx) error {
	_, err := grid.Deserialize(c.Body())
	if err != nil {
		return c.Status(http.StatusBadRequest).SendString("Invalid grid format.")
	}

	storageSrv, err := getStorageService(c)
	if err != nil {
		return err
	}

	metadata, err := storageSrv.CreateFile("application/json", bytes.NewReader(c.Body()))
	if err != nil {
		return c.Status(http.StatusInternalServerError).SendString("Failed to save file.")
	}

	return c.Status(http.StatusCreated).JSON(metadata)
}

// getLevel godoc
//
//	@Summary		Get level
//	@Description	Get level file.
//	@Tags			Level
//	@Produce		json
//	@Param			levelId	path		string	true	"Level ID"
//	@Success		200		{object}	grid.SerializedGrid		"Level file"
//	@Failure		400		{string}	string				"Bad request"
//	@Failure		404		{string}	string				"Level not found"
//	@Failure		500		{string}	string				"Server error"
//	@Router			/api/levels/{levelId} [get]
func getLevel(c fiber.Ctx) error {
	levelIdStr := c.Params("levelId")
	levelId, err := uuid.Parse(levelIdStr)
	if err != nil {
		return c.Status(http.StatusBadRequest).SendString("Invalid level ID.")
	}

	storageSrv, err := getStorageService(c)
	if err != nil {
		return err
	}

	level, err := storageSrv.GetFile(levelId)
	if err != nil {
		return c.Status(http.StatusNotFound).SendString("Level not found.")
	}

	c.Set("Content-Type", level.ContentType)
	if _, err := io.Copy(c.Response().BodyWriter(), level); err != nil {
		return c.Status(http.StatusInternalServerError).SendString("Failed to send level.")
	}

	return nil
}

// deleteLevel godoc
//
//	@Summary		Delete level
//	@Description	Delete level file.
//	@Tags			Level
//	@Produce		json
//	@Param			levelId	path		string	true	"Level ID"
//	@Success		204		"Level deleted successfully"
//	@Failure		400		{string}	string				"Bad request"
//	@Failure		404		{string}	string				"Level not found"
//	@Failure		500		{string}	string				"Server error"
//	@Router			/api/levels/{levelId} [delete]
func deleteLevel(c fiber.Ctx) error {
	levelIdStr := c.Params("levelId")
	levelId, err := uuid.Parse(levelIdStr)
	if err != nil {
		return c.Status(http.StatusBadRequest).SendString("Invalid level ID.")
	}

	storageSrv, err := getStorageService(c)
	if err != nil {
		return err
	}

	if err := storageSrv.DeleteFile(levelId); err != nil {
		return c.Status(http.StatusNotFound).SendString("Level not found.")
	}

	return c.SendStatus(http.StatusNoContent)
}
