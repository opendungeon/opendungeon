package router

import (
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"time"

	"github.com/opendungeon/opendungeon/database"
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
func (app *App) registerUser(w http.ResponseWriter, r *http.Request) {
	email := r.PostFormValue("email")
	password := r.PostFormValue("password")

	conn, err := database.Connect(r.Context())
	if err != nil {
		slog.Error("failed to connect to database", "error", err.Error())
		http.Error(w, "Failed to connect to database.", http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	session, err := handlers.RegisterUser(r.Context(), conn, app.disableUserCreation, email, password, false)
	if err != nil {
		writeHandlerErr(w, err)
		return
	}

	sessionCookie := app.createCookie("session_id", session.ID.String())
	sessionCookie.Expires = time.Unix(session.ExpiresAt, 0)
	http.SetCookie(w, sessionCookie)

	w.WriteHeader(http.StatusCreated)
	_, _ = io.WriteString(w, "Created.")
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
func (app *App) signIn(w http.ResponseWriter, r *http.Request) {
	email := r.PostFormValue("email")
	password := r.PostFormValue("password")

	conn, err := database.Connect(r.Context())
	if err != nil {
		slog.Error("failed to connect to database", "error", err.Error())
		http.Error(w, "Failed to connect to database.", http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	session, err := handlers.SignIn(r.Context(), conn, email, password)
	if err != nil {
		writeHandlerErr(w, err)
		return
	}

	sessionCookie := app.createCookie("session_id", session.ID.String())
	sessionCookie.Expires = time.Unix(session.ExpiresAt, 0)
	http.SetCookie(w, sessionCookie)

	w.WriteHeader(http.StatusCreated)
	_, _ = io.WriteString(w, "Created.")
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
func (app *App) signOut(w http.ResponseWriter, r *http.Request) {
	conn, err := database.Connect(r.Context())
	if err != nil {
		slog.Error("failed to connect to database", "error", err.Error())
		http.Error(w, "Failed to connect to database.", http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	sessionID, ok := getSessionID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized.", http.StatusUnauthorized)
		return
	}

	userID, ok := getUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized.", http.StatusUnauthorized)
		return
	}

	if err := handlers.SignOut(r.Context(), conn, sessionID, userID); err != nil {
		writeHandlerErr(w, err)
		return
	}

	deletedCookie := app.deleteCookie("session_id")
	http.SetCookie(w, deletedCookie)
	w.WriteHeader(http.StatusNoContent)
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
func (app *App) listAuthProviders(w http.ResponseWriter, r *http.Request) {
	providers, err := handlers.ListAuthProviders(r.Context(), app.baseURL, app.discordClientID, app.discordClientSecret)
	if err != nil {
		writeHandlerErr(w, err)
		return
	}

	stateCookie := app.createCookie("oauth_state", providers.State)
	stateCookie.SameSite = http.SameSiteLaxMode
	http.SetCookie(w, stateCookie)

	_ = writeJSON(w, http.StatusOK, providers.Providers)
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
func (app *App) discordCallback(w http.ResponseWriter, r *http.Request) {
	signInUrl := app.clientURL.JoinPath("sign-in")

	stateCookie, err := r.Cookie("oauth_state")
	if err != nil {
		_ = writeString(w, http.StatusBadRequest, "Missing required state.")
		return
	}

	query := r.URL.Query()
	code := query.Get("code")
	state := query.Get("state")

	// CSRF violation
	if stateCookie.Value != state {
		slog.Error("received invalid state in oauth callback")
		signInUrl.RawQuery = url.Values{"error": []string{"Invalid OAuth state."}}.Encode()
		http.Redirect(w, r, signInUrl.String(), http.StatusSeeOther)
		return
	}

	conn, err := database.Connect(r.Context())
	if err != nil {
		slog.Error("failed to connect to database", "error", err.Error())
		http.Error(w, "Failed to connect to database.", http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	session, err := handlers.DiscordCallback(
		r.Context(),
		conn,
		app.disableUserCreation,
		app.discordClientID,
		app.discordClientSecret,
		app.baseURL,
		app.clientURL,
		code,
		state,
	)
	if err != nil {
		q := url.Values{}
		// TODO: set error message
		signInUrl.RawQuery = q.Encode()
		http.Redirect(w, r, signInUrl.String(), http.StatusSeeOther)
		return
	}

	sessionCookie := app.createCookie("session_id", session.ID.String())
	sessionCookie.Expires = time.Unix(session.ExpiresAt, 0)
	http.SetCookie(w, sessionCookie)
	http.Redirect(w, r, app.clientURL.String(), http.StatusSeeOther)
}
