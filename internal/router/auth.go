package router

import (
	"errors"
	"net/url"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
	"github.com/gofiber/fiber/v3/middleware/session"
	"github.com/opendungeon/opendungeon/internal/handlers"
)

// registerUser
//
//	@Summary		Register a new user
//	@Description	Register a new user with email and password.
//	@Tags			Auth
//	@Accept			plain
//	@Param			email		formData	string	true	"Email"
//	@Param			password	formData	string	true	"Password"
//	@Success		201			"Session id cookie"
//	@Failure		400			{string}	string	"Bad request"
//	@Failure		500			{string}	string	"Server error"
//	@Router			/api/auth/register [post]
func (r *router) registerUser(c fiber.Ctx) error {
	var credentials struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	err := c.Bind().Form(&credentials)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).SendString("Invalid request body.")
	}

	db, err := r.db.DB.Conn(c.Context())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to connect to database.")
	}
	defer db.Close()

	userId, err := handlers.RegisterUser(c.Context(), db, r.disableUserCreation, credentials.Email, credentials.Password, false)
	if err != nil {
		return err
	}

	sess := session.FromContext(c)
	sess.Set("user_id", userId)
	return c.SendStatus(fiber.StatusCreated)
}

// signIn
//
//	@Summary		Sign in a user
//	@Description	Sign in a user with email and password.
//	@Tags			Auth
//	@Accept			plain
//	@Param			email		formData	string	true	"Email"
//	@Param			password	formData	string	true	"Password"
//	@Success		201			"Session id cookie"
//	@Failure		400			{string}	string	"Bad request"
//	@Failure		500			{string}	string	"Server error"
//	@Router			/api/auth/sign-in [post]
func (r *router) signIn(c fiber.Ctx) error {
	var credentials struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	err := c.Bind().Form(&credentials)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).SendString("Invalid request body.")
	}

	db, err := r.db.DB.Conn(c.Context())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to connect to database.")
	}
	defer db.Close()

	userId, err := handlers.SignIn(c.Context(), db, credentials.Email, credentials.Password)
	if err != nil {
		return err
	}

	sess := session.FromContext(c)
	sess.Set("user_id", userId)
	return c.SendStatus(fiber.StatusCreated)
}

// signOut
//
//	@Summary		Sign out a user
//	@Description	Sign out a user.
//	@Tags			Auth
//	@Accept			plain
//	@Success		204
//	@Failure		400	{string}	string	"Bad request"
//	@Failure		500	{string}	string	"Server error"
//	@Router			/api/auth/sign-in [post]
func (r *router) signOut(c fiber.Ctx) error {
	sess := session.FromContext(c)
	sess.Delete("user_id")
	return c.SendStatus(fiber.StatusNoContent)
}

// listAuthProviders
//
//	@Summary		List auth providers
//	@Description	List all available auth providers.
//	@Tags			Auth
//	@Produce		json
//	@Success		200	{object}	[]handlers.AuthProvider	"Available auth providers"
//	@Failure		500	{string}	string					"Server error"
//	@Router			/api/auth/providers [get]
func (r *router) listAuthProviders(c fiber.Ctx) error {
	providers, err := handlers.ListAuthProviders(c.Context(), r.baseURL, r.discordClientID, r.discordClientSecret)
	if err != nil {
		return err
	}

	c.Cookie(&fiber.Cookie{
		Name:     "oauth_state",
		Value:    providers.State,
		HTTPOnly: true,
		Secure:   true,
		SameSite: fiber.CookieSameSiteLaxMode,
	})

	return c.JSON(providers.Providers)
}

// discordCallback
//
//	@Summary		Discord callback
//	@Description	Convert Discord auth code into a user and identity.
//	@Tags			Auth
//	@Produce		json
//	@Param			code	query	string	true	"Auth code"
//	@Param			state	query	string	true	"State"
//	@Success		303
//	@Failure		500	{string}	string	"Server error"
//	@Router			/api/auth/providers/discord/callback [get]
func (r *router) discordCallback(c fiber.Ctx) error {
	signInUrl := r.clientURL.JoinPath("sign-in")

	stateCookie := c.Cookies("oauth_state")
	code := c.Query("code")
	state := c.Query("state")

	// CSRF violation
	if stateCookie != state {
		log.Error("received invalid state in oauth callback")
		signInUrl.RawQuery = url.Values{"error": []string{"Invalid OAuth state."}}.Encode()
		return c.Redirect().Status(fiber.StatusSeeOther).To(signInUrl.String())
	}

	db, err := r.db.DB.Conn(c.Context())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to connect to database.")
	}
	defer db.Close()

	redirect, err := handlers.DiscordCallback(
		c.Context(),
		db,
		r.storage,
		r.disableUserCreation,
		r.discordClientID,
		r.discordClientSecret,
		r.baseURL,
		r.clientURL,
		code,
		state,
	)
	if err != nil {
		q := url.Values{}
		fiberErr := new(fiber.Error)
		if errors.As(err, &fiberErr) {
			q.Set("error", fiberErr.Message)
		}
		signInUrl.RawQuery = q.Encode()
		return c.Redirect().Status(fiber.StatusSeeOther).To(signInUrl.String())
	}

	sess := session.FromContext(c)
	sess.Set("user_id", redirect.UserID)

	return c.Redirect().Status(fiber.StatusSeeOther).To(redirect.Redirect.String())
}
