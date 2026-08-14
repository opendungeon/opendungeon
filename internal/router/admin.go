package router

import (
	"io"
	"net/http"
	"time"

	"github.com/gofiber/fiber/v3/log"
	"github.com/opendungeon/opendungeon/database"
	"github.com/opendungeon/opendungeon/internal/handlers"
	"github.com/opendungeon/opendungeon/internal/sessions"
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
//	@Param			confirmPassword	formData	string	true	"Password confirmation"
//	@Success		201			"Session id cookie"
//	@Failure		400			{string}	string	"Bad request"
//	@Failure		500			{string}	string	"Server error"
//	@Router			/api/admin/register [post]
func (router *router) registerAdminUser(w http.ResponseWriter, r *http.Request) {
	if !router.needsSetup {
		http.Error(w, "Gone.", http.StatusGone)
		return
	}

	if err := r.ParseForm(); err != nil {
		http.Error(w, "Invalid form request.", http.StatusBadRequest)
		return
	}

	email := r.FormValue("email")
	password := r.FormValue("password")
	_ = r.FormValue("confirmPassword")

	conn, err := database.Connect(r.Context())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
		http.Error(w, "Failed to connect to database.", http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	userId, err := handlers.RegisterUser(r.Context(), conn, false, email, password, true)
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
