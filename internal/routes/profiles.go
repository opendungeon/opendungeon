package routes

import (
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	_ "github.com/opendungeon/opendungeon/internal/database"
	"github.com/opendungeon/opendungeon/internal/handlers"
)

// upsertProfile
//
//	@Summary		Create or replace profile
//	@Description	Create or replace the profile for the authenticated user.
//	@Tags			Profiles
//	@Accept			json
//	@Produce		json
//	@Param			profile	body		handlers.UpsertedProfile	true	"Profile data"
//	@Success		201		{object}	database.UpsertProfileRow
//	@Failure		400		{string}	string	"Bad request"
//	@Failure		401		{string}	string	"Unauthorized"
//	@Failure		500		{string}	string	"Server error"
//	@Router			/api/profiles/me [put]
func upsertProfile(c fiber.Ctx) error {
	userId, ok := c.Locals("userId").(string)
	if !ok || uuid.Validate(userId) != nil {
		return c.SendStatus(fiber.StatusUnauthorized)
	}

	var profile handlers.UpsertedProfile
	if err := c.Bind().Form(&profile); err != nil {
		return c.Status(fiber.StatusBadRequest).SendString("Invalid request body.")
	}

	dbSrv, err := getDBService(c)
	if err != nil {
		return err
	}

	upserted, err := handlers.UpsertProfile(c.Context(), dbSrv, uuid.MustParse(userId), profile)
	if err != nil {
		return err
	}

	return c.Status(fiber.StatusCreated).JSON(upserted)
}
