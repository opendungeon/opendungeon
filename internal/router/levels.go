package router

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/database"
	"github.com/opendungeon/opendungeon/internal/handlers"
	"github.com/opendungeon/opendungeon/models"
)

type CreateLevelRequest struct {
	Name  string           `json:"name"`
	Level models.LevelData `json:"level"`
}

// upsertLevel
//
//	@Summary		Upsert a level
//	@Description	Upsert a new level for the authenticated user.
//	@Tags			Levels
//	@Accept			json
//	@Produce		json
//	@Param			level	body		CreateLevelRequest	true	"Level data"
//	@Success		201		{object}	handlers.Level
//	@Failure		400		{string}	string	"Bad request"
//	@Failure		401		{string}	string	"Unauthorized"
//	@Failure		500		{string}	string	"Server error"
//	@Router			/api/levels/{levelID} [put]
func (app *App) upsertLevel(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized.", http.StatusUnauthorized)
		return
	}

	levelID, err := uuid.Parse(r.PathValue("levelID"))
	if err != nil {
		http.Error(w, "Invalid level ID.", http.StatusBadRequest)
		return
	}

	var level CreateLevelRequest
	if err := json.NewDecoder(r.Body).Decode(&level); err != nil {
		http.Error(w, "Invalid request body.", http.StatusBadRequest)
		return
	}

	conn, err := database.Connect(r.Context())
	if err != nil {
		slog.Error("failed to connect to database", "error", err.Error())
		http.Error(w, "Failed to connect to database.", http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	created, err := handlers.UpsertLevel(r.Context(), conn, userID, levelID, level.Name, level.Level)
	if err != nil {
		writeHandlerErr(w, err)
		return
	}

	_ = writeJSON(w, http.StatusCreated, created)
}

// listLevels
//
//	@Summary		List levels
//	@Description	List all levels for the authenticated user.
//	@Tags			Levels
//	@Accept			json
//	@Produce		json
//	@Success		200	{array}		database.ListLevelsRow
//	@Failure		401	{string}	string	"Unauthorized"
//	@Failure		500	{string}	string	"Server error"
//	@Router			/api/levels [get]
func (app *App) listLevels(w http.ResponseWriter, r *http.Request) {
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

	levels, err := handlers.ListLevels(r.Context(), conn, userID)
	if err != nil {
		writeHandlerErr(w, err)
		return
	}

	_ = writeJSON(w, http.StatusOK, levels)
}

// getLevel
//
//	@Summary		Get level
//	@Description	Get a specific level for the authenticated user.
//	@Tags			Levels
//	@Accept			json
//	@Produce		json
//	@Success		200	{object}	handlers.Level
//	@Failure		401	{string}	string	"Unauthorized"
//	@Failure		500	{string}	string	"Server error"
//	@Router			/api/levels/{levelId} [get]
func (app *App) getLevel(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized.", http.StatusUnauthorized)
		return
	}

	levelIDStr := r.PathValue("levelID")
	levelID, err := uuid.Parse(levelIDStr)
	if err != nil {
		http.Error(w, "Invalid level ID.", http.StatusBadRequest)
		return
	}

	conn, err := database.Connect(r.Context())
	if err != nil {
		slog.Error("failed to connect to database", "error", err.Error())
		http.Error(w, "Failed to connect to database.", http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	levelData, err := handlers.GetLevel(r.Context(), conn, userID, levelID)
	if err != nil {
		writeHandlerErr(w, err)
		return
	}

	_ = writeJSON(w, http.StatusOK, levelData)
}
