package router

import (
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
	"github.com/opendungeon/opendungeon/database"
	"github.com/opendungeon/opendungeon/internal/handlers"
)

// getMyUser
//
//	@Summary		Get user
//	@Description	Get the details of the authenticated user.
//	@Tags			Users
//	@Produce		json
//	@Success		200	{object}	database.GetUserRow
//	@Failure		401	{string}	string	"Unauthorized"
//	@Failure		404	{string}	string	"Not found"
//	@Failure		500	{string}	string	"Server error"
//	@Router			/api/users/me [get]
func (r *router) getMyUser(c fiber.Ctx) error {
	userId, ok := getUserId(c)
	if !ok {
		return fiber.ErrUnauthorized
	}

	db, err := database.Connect(c.Context())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to connect to database.")
	}
	defer db.Close()

	user, err := handlers.GetUser(c.Context(), db, userId)
	if err != nil {
		return err
	}

	return c.JSON(user)
}
