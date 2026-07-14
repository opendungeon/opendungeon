package routes

import (
	"github.com/gofiber/fiber/v3"
	_ "github.com/opendungeon/opendungeon/internal/database"
	"github.com/opendungeon/opendungeon/internal/handlers"
)

// upsertMyProfile
//
//	@Summary		Create or replace user's profile
//	@Description	Create or replace the profile for the authenticated user.
//	@Tags			Profiles
//	@Accept			plain
//	@Produce		json
//	@Param			profile formData	handlers.UpsertedProfile	true	"Profile data"
//	@Success		201		{object}	database.UpsertProfileRow
//	@Failure		400		{string}	string	"Bad request"
//	@Failure		401		{string}	string	"Unauthorized"
//	@Failure		500		{string}	string	"Server error"
//	@Router			/api/profiles/me [put]
func upsertMyProfile(c fiber.Ctx) error {
	userId, err := getUserId(c)
	if err != nil {
		return err
	}

	var profile handlers.UpsertedProfile
	if err := c.Bind().Form(&profile); err != nil {
		return c.Status(fiber.StatusBadRequest).SendString("Invalid request body.")
	}

	dbSrv, err := getDBService(c)
	if err != nil {
		return err
	}

	upserted, err := handlers.UpsertProfile(c.Context(), dbSrv, userId, profile)
	if err != nil {
		return err
	}

	return c.Status(fiber.StatusCreated).JSON(upserted)
}

// getMyProfile
//
//	@Summary		Get user's profile
//	@Description	Get the profile for the authenticated user.
//	@Tags			Profiles
//	@Produce		json
//	@Success		200		{object}	database.GetProfileRow
//	@Failure		401		{string}	string	"Unauthorized"
//	@Failure		404		{string}	string	"Not found"
//	@Failure		500		{string}	string	"Server error"
//	@Router			/api/profiles/me [get]
func getMyProfile(c fiber.Ctx) error {
	userId, err := getUserId(c)
	if err != nil {
		return err
	}

	dbSrv, err := getDBService(c)
	if err != nil {
		return err
	}

	profile, err := handlers.GetProfile(c.Context(), dbSrv, userId)
	if err != nil {
		return err
	}

	return c.JSON(profile)
}
