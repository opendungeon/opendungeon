package router

import (
	"log/slog"
	"net/http"

	"github.com/opendungeon/opendungeon/database"
	"github.com/opendungeon/opendungeon/internal/handlers"
)

const maxFormSize = 5_000_000

// createCellTexture
//
//	@Summary		Create cell texture
//	@Description	Create a new cell texture.
//	@Tags			Cell Textures
//	@Accept			mpfd
//	@Produce		json
//	@Param			key			formData	string							true	"Texture key"
//	@Param			displayName	formData	string							true	"Texture display name"
//	@Param			file		formData	file							true	"64x64 image file"
//	@Success		201			{object}	database.CreateCellTextureRow	"Newly created texture details"
//	@Failure		400			{string}	string							"Bad request"
//	@Failure		415			{string}	string							"Unsupported media type"
//	@Failure		500			{string}	string							"Server error"
//	@Router			/api/cell-textures [post]
func (app *App) createCellTexture(w http.ResponseWriter, r *http.Request) {
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

	texture, err := handlers.CreateCellTexture(r.Context(), conn, userID, key, displayName, file)
	if err != nil {
		writeHandlerErr(w, err)
		return
	}

	_ = writeJSON(w, http.StatusCreated, texture)
}

// listCellTextures
//
//	@Summary		List cell textures
//	@Description	List all existing cell textures.
//	@Tags			Cell Textures
//	@Produce		json
//	@Success		200	{object}	[]database.ListCellTexturesRow	"List of cell textures"
//	@Failure		500	{string}	string							"Server error"
//	@Router			/api/cell-textures [get]
func (app *App) listCellTextures(w http.ResponseWriter, r *http.Request) {
	conn, err := database.Connect(r.Context())
	if err != nil {
		slog.Error("failed to connect to database", "error", err.Error())
		http.Error(w, "Failed to connect to database.", http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	textures, err := handlers.ListCellTextures(r.Context(), conn)
	if err != nil {
		writeHandlerErr(w, err)
		return
	}

	_ = writeJSON(w, http.StatusOK, textures)
}
