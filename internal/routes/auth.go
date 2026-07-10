package routes

import (
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/session"
	"github.com/opendungeon/opendungeon/internal/handlers"
)

// registerUser godoc
//
//	@Summary		Register a new user
//	@Description	Register a new user with email and password.
//	@Tags			Auth
//	@Accept			json
//	@Produce		json
//	@Param			email	body	string	true	"Email"
//	@Param			password	body	string	true	"Password"
//	@Success		201		"Session id cookie"
//	@Failure		400		{string}	string	"Bad request"
//	@Failure		500		{string}	string	"Server error"
//	@Router			/api/auth/register [post]
func registerUser(c fiber.Ctx) error {
	var credentials struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	err := c.Bind().Form(&credentials)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).SendString("Invalid request body.")
	}

	dbSrv, err := getDBService(c)
	if err != nil {
		return err
	}

	userId, err := handlers.RegisterUser(c.Context(), dbSrv, credentials.Email, credentials.Password)
	if err != nil {
		return err
	}

	sess := session.FromContext(c)
	sess.Set("user_id", userId.String())

	return c.SendStatus(fiber.StatusCreated)
}

// signIn godoc
//
//	@Summary		Sign in a user
//	@Description	Sign in a user with email and password.
//	@Tags			Auth
//	@Accept			json
//	@Produce		json
//	@Param			email	body	string	true	"Email"
//	@Param			password	body	string	true	"Password"
//	@Success		201		"Session id cookie"
//	@Failure		400		{string}	string	"Bad request"
//	@Failure		500		{string}	string	"Server error"
//	@Router			/api/auth/sign-in [post]
func signIn(c fiber.Ctx) error {
	var credentials struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	err := c.Bind().Form(&credentials)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).SendString("Invalid request body.")
	}

	dbSrv, err := getDBService(c)
	if err != nil {
		return err
	}

	userId, err := handlers.SignIn(c.Context(), dbSrv, credentials.Email, credentials.Password)
	if err != nil {
		return err
	}

	sess := session.FromContext(c)
	sess.Set("user_id", userId.String())

	return c.SendStatus(fiber.StatusCreated)
}
