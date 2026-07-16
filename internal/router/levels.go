package router

import (
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	_ "github.com/opendungeon/opendungeon/internal/database"
	"github.com/opendungeon/opendungeon/internal/handlers"
	"github.com/opendungeon/opendungeon/pkg/grid"
)

type CreateLevelRequest struct {
	Name  string              `json:"name"`
	Level grid.SerializedGrid `json:"level"`
}

// createLevel
//
//	@Summary		Create a level
//	@Description	Create a new level for the authenticated user.
//	@Tags			Levels
//	@Accept			json
//	@Produce		json
//	@Param			level	body		CreateLevelRequest	true	"Level data"
//	@Success		201		{object}	database.CreateLevelRow
//	@Failure		400		{string}	string	"Bad request"
//	@Failure		401		{string}	string	"Unauthorized"
//	@Failure		500		{string}	string	"Server error"
//	@Router			/api/levels [post]
func (r *router) createLevel(c fiber.Ctx) error {
	var level CreateLevelRequest
	err := c.Bind().JSON(&level)
	if err != nil {
		return c.SendStatus(fiber.StatusBadRequest)
	}

	userId, ok := getUserId(c)
	if !ok {
		return c.SendStatus(fiber.StatusUnauthorized)
	}

	created, err := handlers.CreateLevel(c.Context(), r.db, r.storage, userId, level.Name, level.Level)
	if err != nil {
		return err
	}

	return c.Status(fiber.StatusCreated).JSON(created)
}

// listLevels
//
//	@Summary		List levels
//	@Description	List all levels for the authenticated user.
//	@Tags			Levels
//	@Accept			json
//	@Produce		json
//	@Success		200	{array}		database.ListLevelsRow
//	@Failure		401	{string}	string	"Unauthorized"
//	@Failure		500	{string}	string	"Server error"
//	@Router			/api/levels [get]
func (r *router) listLevels(c fiber.Ctx) error {
	userId, ok := getUserId(c)
	if !ok {
		return c.SendStatus(fiber.StatusUnauthorized)
	}

	levels, err := handlers.ListLevels(c.Context(), r.db, userId)
	if err != nil {
		return err
	}

	return c.JSON(levels)
}

// getLevel
//
//	@Summary		Get level
//	@Description	Get a specific level for the authenticated user.
//	@Tags			Levels
//	@Accept			json
//	@Produce		json
//	@Success		200	{object}	grid.SerializedGrid
//	@Failure		401	{string}	string	"Unauthorized"
//	@Failure		500	{string}	string	"Server error"
//	@Router			/api/levels/{levelId} [get]
func (r *router) getLevel(c fiber.Ctx) error {
	userId, ok := getUserId(c)
	if !ok {
		return c.SendStatus(fiber.StatusUnauthorized)
	}

	levelIdStr := c.Params("levelId")
	levelId, err := uuid.Parse(levelIdStr)
	if err != nil {
		return c.SendStatus(fiber.StatusBadRequest)
	}

	levelData, err := handlers.GetLevel(c.Context(), r.db, r.storage, userId, levelId)
	if err != nil {
		return err
	}

	return c.JSON(levelData)
}
