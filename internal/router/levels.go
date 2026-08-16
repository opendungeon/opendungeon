package router

import (
	"encoding/json"
	"net/http"

	"github.com/gofiber/fiber/v3/log"
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/database"
	"github.com/opendungeon/opendungeon/internal/handlers"
	"github.com/opendungeon/opendungeon/pkg/grid"
)

type CreateLevelRequest struct {
	Name  string              `json:"name"`
	Level grid.SerializedGrid `json:"level"`
}

// createLevel
//
//	@Summary		Create a level
//	@Description	Create a new level for the authenticated user.
//	@Tags			Levels
//	@Accept			json
//	@Produce		json
//	@Param			level	body		CreateLevelRequest	true	"Level data"
//	@Success		201		{object}	handlers.Level
//	@Failure		400		{string}	string	"Bad request"
//	@Failure		401		{string}	string	"Unauthorized"
//	@Failure		500		{string}	string	"Server error"
//	@Router			/api/levels [post]
func (app *router) createLevel(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized.", http.StatusUnauthorized)
		return
	}

	var level CreateLevelRequest
	if err := json.NewDecoder(r.Body).Decode(&level); err != nil {
		http.Error(w, "Invalid request body.", http.StatusBadRequest)
		return
	}

	conn, err := database.Connect(r.Context())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
		http.Error(w, "Failed to connect to database.", http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	created, err := handlers.CreateLevel(r.Context(), conn, userID, level.Name, level.Level)
	if err != nil {
		// TODO: handle
	}

	w.WriteHeader(http.StatusCreated)
	_ = writeJSON(w, created)
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
func (app *router) listLevels(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized.", http.StatusUnauthorized)
		return
	}

	conn, err := database.Connect(r.Context())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
		http.Error(w, "Failed to connect to database.", http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	levels, err := handlers.ListLevels(r.Context(), conn, userID)
	if err != nil {
		// TODO: handle
	}

	_ = writeJSON(w, levels)
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
func (app *router) getLevel(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized.", http.StatusUnauthorized)
		return
	}

	levelIDStr := r.PathValue("levelId")
	levelID, err := uuid.Parse(levelIDStr)
	if err != nil {
		http.Error(w, "Invalid level ID.", http.StatusBadRequest)
		return
	}

	conn, err := database.Connect(r.Context())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
		http.Error(w, "Failed to connect to database.", http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	levelData, err := handlers.GetLevel(r.Context(), conn, userID, levelID)
	if err != nil {
		// TODO: handle
	}

	_ = writeJSON(w, levelData)
}

// updateLevel
//
//	@Summary		Update level
//	@Description	Update a specific level for the authenticated user.
//	@Tags			Levels
//	@Accept			json
//	@Produce		json
//	@Param			level	body		CreateLevelRequest	true	"Level data"
//	@Success		200	{object}	handlers.Level
//	@Failure		401	{string}	string	"Unauthorized"
//	@Failure		500	{string}	string	"Server error"
//	@Router			/api/levels/{levelId} [put]
func (app *router) updateLevel(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized.", http.StatusUnauthorized)
		return
	}

	levelID, err := uuid.Parse(r.PathValue("levelId"))
	if err != nil {
		http.Error(w, "Not found.", http.StatusNotFound)
		return
	}

	var level CreateLevelRequest
	if err := json.NewDecoder(r.Body).Decode(&level); err != nil {
		http.Error(w, "Invalid request body.", http.StatusBadRequest)
		return
	}

	conn, err := database.Connect(r.Context())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
		http.Error(w, "Failed to connect to database.", http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	updated, err := handlers.UpdateLevel(r.Context(), conn, userID, levelID, level.Name, level.Level)
	if err != nil {
		// TODO: handle
	}

	w.WriteHeader(http.StatusCreated)
	_ = writeJSON(w, updated)
}
