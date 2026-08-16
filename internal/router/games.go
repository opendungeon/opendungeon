package router

import (
	"log/slog"
	"net/http"

	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/database"
	"github.com/opendungeon/opendungeon/internal/handlers"
)

// createGame
//
//	@Summary		Create game
//	@Description	Create a new game.
//	@Tags			Games
//	@Accept			plain
//	@Produce		json
//	@Param			name	formData	string					true	"Game name"
//	@Success		201		{object}	database.CreateGameRow	"Newly created game details"
//	@Failure		400		{string}	string					"Bad request"
//	@Failure		404		{string}	string					"Not found"
//	@Failure		500		{string}	string					"Server error"
//	@Router			/api/games [post]
func (app *App) createGame(w http.ResponseWriter, r *http.Request) {
	userId, ok := getUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized.", http.StatusUnauthorized)
		return
	}

	name := r.PostFormValue("name")

	conn, err := database.Connect(r.Context())
	if err != nil {
		slog.Error("failed to connect to database", "error", err.Error())
		http.Error(w, "Failed to connect to database.", http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	game, err := handlers.CreateGame(r.Context(), conn, userId, name)
	if err != nil {
		writeHandlerErr(w, err)
		return
	}

	_ = writeJSON(w, http.StatusOK, game)
}

// createGamePlayer
//
//	@Summary		Create game player
//	@Description	Create a new game player.
//	@Tags			Games
//	@Accept			plain
//	@Produce		json
//	@Param			userId	formData	string					true	"Player user ID"
//	@Success		201		{object}	database.CreateGamePlayerRow	"Newly created game player details"
//	@Failure		400		{string}	string					"Bad request"
//	@Failure		404		{string}	string					"Not found"
//	@Failure		500		{string}	string					"Server error"
//	@Router			/api/games/{gameID}/players [post]
func (app *App) createGamePlayer(w http.ResponseWriter, r *http.Request) {
	creatorId, ok := getUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized.", http.StatusUnauthorized)
		return
	}

	gameIdStr := r.PathValue("gameID")
	gameId, err := uuid.Parse(gameIdStr)
	if err != nil {
		http.Error(w, "Invalid game ID.", http.StatusBadRequest)
		return
	}

	userIdStr := r.PostFormValue("userId")
	userId, err := uuid.Parse(userIdStr)
	if err != nil {
		http.Error(w, "Invalid user ID.", http.StatusBadRequest)
		return
	}

	permissionLevel := r.PostFormValue("permissionLevel")
	if permissionLevel != "player" && permissionLevel != "game_master" {
		http.Error(w, "Invalid permission level.", http.StatusBadRequest)
		return
	}

	conn, err := database.Connect(r.Context())
	if err != nil {
		slog.Error("failed to connect to database", "error", err.Error())
		http.Error(w, "Failed to connect to database.", http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	player, err := handlers.CreateGamePlayer(r.Context(), conn, gameId, creatorId, userId, permissionLevel)
	if err != nil {
		writeHandlerErr(w, err)
		return
	}

	_ = writeJSON(w, http.StatusCreated, player)
}

// getGame
//
//	@Summary		Get game
//	@Description	Get an existing game.
//	@Tags			Games
//	@Produce		json
//	@Success		200		{object}	database.GetGameRow	"Game details"
//	@Failure		400		{string}	string					"Bad request"
//	@Failure		404		{string}	string					"Not found"
//	@Failure		500		{string}	string					"Server error"
//	@Router			/api/games/{gameID} [get]
func (app *App) getGame(w http.ResponseWriter, r *http.Request) {
	userId, ok := getUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized.", http.StatusUnauthorized)
		return
	}

	gameIdStr := r.PathValue("gameID")
	gameId, err := uuid.Parse(gameIdStr)
	if err != nil {
		http.Error(w, "Invalid game ID.", http.StatusBadRequest)
		return
	}

	conn, err := database.Connect(r.Context())
	if err != nil {
		slog.Error("failed to connect to database", "error", err.Error())
		http.Error(w, "Failed to connect to database.", http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	game, err := handlers.GetGame(r.Context(), conn, userId, gameId)
	if err != nil {
		writeHandlerErr(w, err)
		return
	}

	_ = writeJSON(w, http.StatusOK, game)
}

// listGames
//
//	@Summary		Get user's games
//	@Description	Get all games in which the user is a player.
//	@Tags			Games
//	@Produce		json
//	@Success		200		{array}	models.Game	"Games"
//	@Failure		400		{string}	string					"Bad request"
//	@Failure		404		{string}	string					"Not found"
//	@Failure		500		{string}	string					"Server error"
//	@Router			/api/games [get]
func (app *App) listGames(w http.ResponseWriter, r *http.Request) {
	userId, ok := getUserID(r.Context())
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

	games, err := handlers.ListGames(r.Context(), conn, userId)
	if err != nil {
		writeHandlerErr(w, err)
		return
	}

	_ = writeJSON(w, http.StatusOK, games)
}
