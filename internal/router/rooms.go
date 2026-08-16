package router

import (
	"log/slog"
	"net/http"

	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/database"
	"github.com/opendungeon/opendungeon/internal/handlers"
)

// joinRoom
//
//	@Summary		Join game
//	@Description	Join an existing game via a web socket.
//	@Tags			Games
//	@Router			/api/rooms/{gameID} [get]
func (app *App) joinRoom(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized.", http.StatusUnauthorized)
		return
	}

	gameIDStr := r.PathValue("gameID")
	gameID, err := uuid.Parse(gameIDStr)
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

	ws, err := app.wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Error("failed to upgrade connection", "error", err.Error())
		http.Error(w, "Failed to upgrade connection.", http.StatusInternalServerError)
		return
	}

	if err := handlers.JoinRoom(r.Context(), ws, conn, userID, gameID); err != nil {
		writeHandlerErr(w, err)
		return
	}
}
