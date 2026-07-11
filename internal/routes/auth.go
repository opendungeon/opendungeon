package routes

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
func registerUser(c fiber.Ctx) error {
	var credentials struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	err := c.Bind().Form(&credentials)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).SendString("Invalid request body.")
	}

	disableUserCreation, err := getState[bool](c, "disableUserCreation")
	if err != nil {
		return err
	}

	dbSrv, err := getDBService(c)
	if err != nil {
		return err
	}

	userId, err := handlers.RegisterUser(c.Context(), disableUserCreation, dbSrv, credentials.Email, credentials.Password)
	if err != nil {
		return err
	}

	sess := session.FromContext(c)
	sess.Set("user_id", userId.String())
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

// listAuthProviders
//
//	@Summary		List auth providers
//	@Description	List all available auth providers.
//	@Tags			Auth
//	@Produce		json
//	@Success		200	{object}	[]handlers.AuthProvider	"Available auth providers"
//	@Failure		500	{string}	string					"Server error"
//	@Router			/api/auth/providers [get]
func listAuthProviders(c fiber.Ctx) error {
	baseUrl, err := getState[*url.URL](c, "baseUrl")
	if err != nil {
		return err
	}

	discordClientID, err := getState[string](c, "discordClientId")
	if err != nil {
		return err
	}

	discordClientSecret, err := getState[string](c, "discordClientSecret")
	if err != nil {
		return err
	}

	providers, err := handlers.ListAuthProviders(c.Context(), baseUrl, discordClientID, discordClientSecret)
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
func discordCallback(c fiber.Ctx) error {
	disableUserCreation, err := getState[bool](c, "disableUserCreation")
	if err != nil {
		return err
	}

	dbSrv, err := getDBService(c)
	if err != nil {
		return err
	}

	discordClientID, err := getState[string](c, "discordClientId")
	if err != nil {
		return err
	}

	discordClientSecret, err := getState[string](c, "discordClientSecret")
	if err != nil {
		return err
	}

	baseUrl, err := getState[*url.URL](c, "baseUrl")
	if err != nil {
		return err
	}

	clientUrl, err := getState[*url.URL](c, "clientUrl")
	if err != nil {
		return err
	}

	signInUrl := clientUrl.JoinPath("sign-in")

	stateCookie := c.Cookies("oauth_state")
	code := c.Query("code")
	state := c.Query("state")

	// CSRF violation
	if stateCookie != state {
		log.Error("received invalid state in oauth callback")
		signInUrl.RawQuery = url.Values{"error": []string{"Invalid OAuth state."}}.Encode()
		return c.Redirect().Status(fiber.StatusSeeOther).To(signInUrl.String())
	}

	redirect, err := handlers.DiscordCallback(c.Context(), disableUserCreation, dbSrv, discordClientID, discordClientSecret, baseUrl, clientUrl, code, state)
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
	sess.Set("user_id", redirect.UserID.String())

	return c.Redirect().Status(fiber.StatusSeeOther).To(redirect.Redirect.String())
}
