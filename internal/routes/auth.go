package routes

import (
	"github.com/gofiber/fiber/v3"
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
//	@Success		201		{string}	string	"JWT token"
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

	token, err := handlers.RegisterUser(c.Context(), dbSrv, credentials.Email, credentials.Password)
	if err != nil {
		return err
	}

	cookie := new(fiber.Cookie)
	cookie.Name = "access_token"
	cookie.Value = token.Token
	cookie.Expires = token.ExpiresAt
	c.Cookie(cookie)

	return c.SendStatus(fiber.StatusCreated)
}

func signIn(c fiber.Ctx) error {
	return nil
}
