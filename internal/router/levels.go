package router

import (
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
	"github.com/google/uuid"
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
//	@Success		201		{object}	handlers.Level
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

	db, err := r.db.Conn(c.Context())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to connect to database.")
	}
	defer db.Close()

	created, err := handlers.CreateLevel(c.Context(), db, r.storageDir, userId, level.Name, level.Level)
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

	db, err := r.db.Conn(c.Context())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to connect to database.")
	}
	defer db.Close()

	levels, err := handlers.ListLevels(c.Context(), db, userId)
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
//	@Success		200	{object}	handlers.Level
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

	db, err := r.db.Conn(c.Context())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to connect to database.")
	}
	defer db.Close()

	levelData, err := handlers.GetLevel(c.Context(), db, r.storageDir, userId, levelId)
	if err != nil {
		return err
	}

	return c.JSON(levelData)
}

// updateLevel
//
//	@Summary		Update level
//	@Description	Update a specific level for the authenticated user.
//	@Tags			Levels
//	@Accept			json
//	@Produce		json
//	@Param			level	body		CreateLevelRequest	true	"Level data"
//	@Success		200	{object}	handlers.Level
//	@Failure		401	{string}	string	"Unauthorized"
//	@Failure		500	{string}	string	"Server error"
//	@Router			/api/levels/{levelId} [put]
func (r *router) updateLevel(c fiber.Ctx) error {
	userId, ok := getUserId(c)
	if !ok {
		return c.SendStatus(fiber.StatusUnauthorized)
	}

	levelID, err := uuid.Parse(c.Params("levelId"))
	if err != nil {
		return c.SendStatus(fiber.StatusNotFound)
	}

	var level CreateLevelRequest
	if err := c.Bind().JSON(&level); err != nil {
		return c.SendStatus(fiber.StatusBadRequest)
	}

	db, err := r.db.Conn(c.Context())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to connect to database.")
	}
	defer db.Close()

	created, err := handlers.UpdateLevel(c.Context(), db, r.storageDir, userId, levelID, level.Name, level.Level)
	if err != nil {
		return err
	}

	return c.Status(fiber.StatusCreated).JSON(created)
}
