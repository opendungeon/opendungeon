package router

import (
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/session"
	"github.com/opendungeon/opendungeon/internal/handlers"
)

// registerAdminUser
//
//	@Summary		Register a new admin user
//	@Description	Register a new admin user with email and password.
//	@Description	Only works while no admins exist.
//	@Tags			Admin
//	@Accept			plain
//	@Param			email		formData	string	true	"Email"
//	@Param			password	formData	string	true	"Password"
//	@Success		201			"Session id cookie"
//	@Failure		400			{string}	string	"Bad request"
//	@Failure		500			{string}	string	"Server error"
//	@Router			/api/admin/register [post]
func (r *router) registerAdminUser(c fiber.Ctx) error {
	if !r.needsSetup {
		return c.SendStatus(fiber.StatusGone)
	}

	var credentials struct {
		Email           string `json:"email"`
		Password        string `json:"password"`
		ConfirmPassword string `json:"confirmPassword"` // TODO: check this
	}

	if err := c.Bind().Form(&credentials); err != nil {
		return c.SendStatus(fiber.StatusBadRequest)
	}

	userId, err := handlers.RegisterUser(c.Context(), false, r.db, credentials.Email, credentials.Password, true)
	if err != nil {
		return err
	}

	r.needsSetup = false
	sess := session.FromContext(c)
	sess.Set("user_id", userId)
	return c.SendStatus(fiber.StatusCreated)
}
