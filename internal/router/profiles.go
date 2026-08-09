package router

import (
	"mime/multipart"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
	"github.com/opendungeon/opendungeon/internal/handlers"
)

// upsertMyProfile
//
//	@Summary		Create or replace user's profile
//	@Description	Create or replace the profile for the authenticated user.
//	@Tags			Profiles
//	@Accept			mpfd
//	@Produce		json
//	@Param			username	formData	string	true	"Username"
//	@Param			avatar		formData	file	false	"Avatar image file"
//	@Success		201			{object}	database.UpsertProfileRow
//	@Failure		400			{string}	string	"Bad request"
//	@Failure		401			{string}	string	"Unauthorized"
//	@Failure		500			{string}	string	"Server error"
//	@Router			/api/profiles/me [put]
func (r *router) upsertMyProfile(c fiber.Ctx) error {
	userId, ok := getUserId(c)
	if !ok {
		return fiber.ErrUnauthorized
	}

	form, err := c.MultipartForm()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).SendString("Invalid request body.")
	}

	usernames, ok := form.Value["username"]
	if !ok || len(usernames) < 1 {
		return c.Status(fiber.StatusBadRequest).SendString("Missing username.")
	}
	username := usernames[0]

	var avatar multipart.File
	avatars, ok := form.File["avatar"]
	if ok && len(avatars) == 1 {
		avatar, err = avatars[0].Open()
		if err != nil {
			return c.Status(fiber.StatusBadRequest).SendString("Failed to open avatar.")
		}
	}

	db, err := r.db.Conn(c.Context())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to connect to database.")
	}
	defer db.Close()

	upserted, err := handlers.UpsertProfile(c.Context(), db, r.storageDir, userId, username, avatar)
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
//	@Success		200	{object}	database.GetProfileRow
//	@Failure		401	{string}	string	"Unauthorized"
//	@Failure		404	{string}	string	"Not found"
//	@Failure		500	{string}	string	"Server error"
//	@Router			/api/profiles/me [get]
func (r router) getMyProfile(c fiber.Ctx) error {
	userID, ok := getUserId(c)
	if !ok {
		return fiber.ErrUnauthorized
	}

	db, err := r.db.Conn(c.Context())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to connect to database.")
	}
	defer db.Close()

	profile, err := handlers.GetProfile(c.Context(), db, userID)
	if err != nil {
		return err
	}

	return c.JSON(profile)
}
