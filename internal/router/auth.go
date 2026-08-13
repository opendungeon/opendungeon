package router

import (
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/gofiber/fiber/v3/log"
	"github.com/opendungeon/opendungeon/database"
	"github.com/opendungeon/opendungeon/internal/handlers"
	"github.com/opendungeon/opendungeon/internal/sessions"
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
func (router *router) registerUser(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Invalid form body.", http.StatusBadRequest)
		return
	}

	email := r.FormValue("email")
	password := r.FormValue("password")

	conn, err := database.Connect(r.Context())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
		http.Error(w, "Failed to connect to database.", http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	userId, err := handlers.RegisterUser(r.Context(), conn, router.disableUserCreation, email, password, false)
	if err != nil {
		// TODO: handle
	}

	session, err := sessions.Create(r.Context(), conn, userId)
	if err != nil {
		// TODO: handle
	}

	sessionCookie := router.createCookie("session_id", session.ID.String())
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
func (router *router) signIn(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Invalid form body.", http.StatusBadRequest)
		return
	}

	email := r.FormValue("email")
	password := r.FormValue("password")

	conn, err := database.Connect(r.Context())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
		http.Error(w, "Failed to connect to database.", http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	userId, err := handlers.SignIn(r.Context(), conn, email, password)
	if err != nil {
		// TODO: handle
	}

	session, err := sessions.Create(r.Context(), conn, userId)
	if err != nil {
		// TODO: handle
	}

	sessionCookie := router.createCookie("session_id", session.ID.String())
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
func (router *router) signOut(w http.ResponseWriter, r *http.Request) {
	conn, err := database.Connect(r.Context())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
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

	if err := sessions.DeleteSession(r.Context(), conn, sessionID, userID); err != nil {
		// TODO: handle
	}

	deletedCookie := router.deleteCookie("session_id")
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
func (router *router) listAuthProviders(w http.ResponseWriter, r *http.Request) {
	providers, err := handlers.ListAuthProviders(r.Context(), router.baseURL, router.discordClientID, router.discordClientSecret)
	if err != nil {
		// TODO: handle
	}

	stateCookie := router.createCookie("oauth_state", providers.State)
	stateCookie.SameSite = http.SameSiteLaxMode
	http.SetCookie(w, stateCookie)

	_ = writeJSON(w, providers.Providers)
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
func (router *router) discordCallback(w http.ResponseWriter, r *http.Request) {
	signInUrl := router.clientURL.JoinPath("sign-in")

	stateCookie, err := r.Cookie("oauth_state")
	if err != nil {
		// TODO: handle
	}

	query := r.URL.Query()
	code := query.Get("code")
	state := query.Get("state")

	// CSRF violation
	if stateCookie.Value != state {
		log.Error("received invalid state in oauth callback")
		signInUrl.RawQuery = url.Values{"error": []string{"Invalid OAuth state."}}.Encode()
		http.Redirect(w, r, signInUrl.String(), http.StatusSeeOther)
		return
	}

	conn, err := database.Connect(r.Context())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
		http.Error(w, "Failed to connect to database.", http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	redirect, err := handlers.DiscordCallback(
		r.Context(),
		conn,
		router.disableUserCreation,
		router.discordClientID,
		router.discordClientSecret,
		router.baseURL,
		router.clientURL,
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

	session, err := sessions.Create(r.Context(), conn, redirect.UserID)
	if err != nil {
		// TODO: handle
	}

	sessionCookie := router.createCookie("session_id", session.ID.String())
	sessionCookie.Expires = time.Unix(session.ExpiresAt, 0)
	http.SetCookie(w, sessionCookie)
	http.Redirect(w, r, redirect.Redirect.String(), http.StatusSeeOther)
}
