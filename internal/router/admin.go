package router

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/opendungeon/opendungeon/database"
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
//	@Param			confirmPassword	formData	string	true	"Password confirmation"
//	@Success		201			"Session id cookie"
//	@Failure		400			{string}	string	"Bad request"
//	@Failure		500			{string}	string	"Server error"
//	@Router			/api/admin/register [post]
func (app *App) registerAdminUser(w http.ResponseWriter, r *http.Request) {
	if !app.needsSetup {
		http.Error(w, "Gone.", http.StatusGone)
		return
	}

	email := r.PostFormValue("email")
	password := r.PostFormValue("password")
	_ = r.PostFormValue("confirmPassword")

	conn, err := database.Connect(r.Context())
	if err != nil {
		slog.Error("failed to connect to database", "error", err.Error())
		http.Error(w, "Failed to connect to database.", http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	session, err := handlers.RegisterUser(r.Context(), conn, false, email, password, true)
	if err != nil {
		writeHandlerErr(w, err)
		return
	}
	app.needsSetup = false

	sessionCookie := app.createCookie("session_id", session.ID.String())
	sessionCookie.Expires = time.Unix(session.ExpiresAt, 0)
	http.SetCookie(w, sessionCookie)

	_ = writeString(w, http.StatusCreated, "Created.")
}
