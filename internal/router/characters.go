package router

import (
	"log/slog"
	"net/http"
	"uuid"

	"github.com/opendungeon/opendungeon/database"
	"github.com/opendungeon/opendungeon/internal/handlers"
)

// upsertcharacter
//
//	@Summary		Upsert a character
//	@Description	Upsert a new character for the authenticated user.
//	@Tags			Characters
//	@Accept			json
//	@Produce		json
//	@Param			name			formData	string							true	"name"
//	@Param			file		formData	file							true	"model"
//	@Success		201		{object}	handlers.character
//	@Failure		400		{string}	string	"Bad request"
//	@Failure		401		{string}	string	"Unauthorized"
//	@Failure		500		{string}	string	"Server error"
//	@Router			/api/characters/{characterID} [put]
func (app *App) upsertCharacter(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized.", http.StatusUnauthorized)
		return
	}

	characterID, err := uuid.Parse(r.PathValue("characterID"))
	if err != nil {
		http.Error(w, "Invalid character ID.", http.StatusBadRequest)
		return
	}

	if err := r.ParseMultipartForm(maxFormSize); err != nil {
		http.Error(w, "Invalid request body.", http.StatusBadRequest)
		return
	}

	name := r.PostFormValue("name")
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

	created, err := handlers.UpsertCharacter(r.Context(), conn, userID, characterID, name, file)
	if err != nil {
		writeHandlerErr(w, err)
		return
	}

	_ = writeJSON(w, http.StatusCreated, created)
}

// listCharacters
//
//	@Summary		List characters
//	@Description	List all existing characters for the user.
//	@Tags			Characters
//	@Produce		json
//	@Success		200	{object}	[]database.ListCharactersRow	"List of characters"
//	@Failure		500	{string}	string							"Server error"
//	@Router			/api/characters [get]
func (app *App) listCharacters(w http.ResponseWriter, r *http.Request) {
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

	characters, err := handlers.ListCharacters(r.Context(), conn, userID)
	if err != nil {
		writeHandlerErr(w, err)
		return
	}

	_ = writeJSON(w, http.StatusOK, characters)
}
