package router

import (
	"log/slog"
	"net/http"

	"github.com/opendungeon/opendungeon/database"
	"github.com/opendungeon/opendungeon/internal/handlers"
)

// createDecoration
//
//	@Summary		Create decoration
//	@Description	Create a new decoration.
//	@Tags			Decorations
//	@Accept			mpfd
//	@Produce		json
//	@Param			key			formData	string							true	"Decoration key"
//	@Param			displayName	formData	string							true	"Decoration display name"
//	@Param			file		formData	file							true	"3D model file"
//	@Success		201			{object}	database.CreateDecorationRow	"Newly created decoration details"
//	@Failure		400			{string}	string							"Bad request"
//	@Failure		415			{string}	string							"Unsupported media type"
//	@Failure		500			{string}	string							"Server error"
//	@Router			/api/decorations [post]
func (app *App) createDecoration(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized.", http.StatusUnauthorized)
		return
	}

	if err := r.ParseMultipartForm(maxFormSize); err != nil {
		http.Error(w, "Invalid request body.", http.StatusBadRequest)
		return
	}

	key := r.PostFormValue("key")
	displayName := r.PostFormValue("displayName")
	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Invalid form file.", http.StatusBadRequest)
		return
	}
	defer file.Close()

	conn, err := database.Connect(r.Context())
	if err != nil {
		slog.Error("failed to connect to database", "error", err.Error())
		http.Error(w, "Failed to connect to database.", http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	decoration, err := handlers.CreateDecoration(r.Context(), conn, userID, key, displayName, file)
	if err != nil {
		writeHandlerErr(w, err)
		return
	}

	_ = writeJSON(w, http.StatusCreated, decoration)
}

// listDecorations
//
//	@Summary		List decorations
//	@Description	List all existing decorations.
//	@Tags			Decorations
//	@Produce		json
//	@Success		200	{object}	[]database.ListDecorationsRow	"List of decorations"
//	@Failure		500	{string}	string							"Server error"
//	@Router			/api/decorations [get]
func (app *App) listDecorations(w http.ResponseWriter, r *http.Request) {
	conn, err := database.Connect(r.Context())
	if err != nil {
		slog.Error("failed to connect to database", "error", err.Error())
		http.Error(w, "Failed to connect to database.", http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	decorations, err := handlers.ListDecorations(r.Context(), conn)
	if err != nil {
		writeHandlerErr(w, err)
		return
	}

	_ = writeJSON(w, http.StatusOK, decorations)
}
