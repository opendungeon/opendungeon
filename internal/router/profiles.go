package router

import (
	"log/slog"
	"net/http"

	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/database"
	"github.com/opendungeon/opendungeon/internal/handlers"
)

// upsertMyProfile
//
//	@Summary		Create or replace user's profile
//	@Description	Create or replace the profile for the authenticated user.
//	@Tags			Profiles
//	@Accept			mpfd
//	@Produce		json
//	@Param			username	formData	string	true	"Username"
//	@Param			avatar		formData	file	false	"Avatar image file"
//	@Success		201			{object}	database.UpsertProfileRow
//	@Failure		400			{string}	string	"Bad request"
//	@Failure		401			{string}	string	"Unauthorized"
//	@Failure		500			{string}	string	"Server error"
//	@Router			/api/profiles/me [put]
func (app *App) upsertMyProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized.", http.StatusUnauthorized)
		return
	}

	if err := r.ParseMultipartForm(maxFormSize); err != nil {
		http.Error(w, "Invalid request body.", http.StatusBadRequest)
		return
	}

	username := r.PostFormValue("username")
	if username == "" {
		http.Error(w, "Missing username.", http.StatusBadRequest)
		return
	}

	avatar, _, err := r.FormFile("avatar")
	if err != nil && err != http.ErrMissingFile {
		http.Error(w, "Failed to open avatar.", http.StatusBadRequest)
		return
	}
	if avatar != nil {
		defer avatar.Close()
	}

	conn, err := database.Connect(r.Context())
	if err != nil {
		slog.Error("failed to connect to database", "error", err.Error())
		http.Error(w, "Failed to connect to database.", http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	upserted, err := handlers.UpsertProfile(r.Context(), conn, userID, username, avatar)
	if err != nil {
		writeHandlerErr(w, err)
		return
	}

	_ = writeJSON(w, http.StatusCreated, upserted)
}

// getMyProfile
//
//	@Summary		Get user's profile
//	@Description	Get the profile for the authenticated user.
//	@Tags			Profiles
//	@Produce		json
//	@Success		200	{object}	database.GetProfileRow
//	@Failure		401	{string}	string	"Unauthorized"
//	@Failure		404	{string}	string	"Not found"
//	@Failure		500	{string}	string	"Server error"
//	@Router			/api/profiles/me [get]
func (app *App) getMyProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized.", http.StatusUnauthorized)
		return
	}

	conn, err := database.Connect(r.Context())
	if err != nil {
		slog.Error("failed to connect to database", "error", err.Error())
		http.Error(w, "Failed to connect to database.", http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	profile, err := handlers.GetProfile(r.Context(), conn, userID)
	if err != nil {
		writeHandlerErr(w, err)
		return
	}

	_ = writeJSON(w, http.StatusOK, profile)
}

func (app *App) getProfile(w http.ResponseWriter, r *http.Request) {
	_, ok := getUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized.", http.StatusUnauthorized)
		return
	}

	userID, err := uuid.Parse(r.PathValue("userID"))
	if err != nil {
		http.Error(w, "Invalid user ID.", http.StatusBadRequest)
		return
	}

	conn, err := database.Connect(r.Context())
	if err != nil {
		slog.Error("failed to connect to database", "error", err.Error())
		http.Error(w, "Failed to connect to database.", http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	profile, err := handlers.GetProfile(r.Context(), conn, userID)
	if err != nil {
		writeHandlerErr(w, err)
		return
	}

	_ = writeJSON(w, http.StatusOK, profile)
}
