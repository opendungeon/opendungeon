package router

import (
	"net/http"

	"github.com/google/uuid"
)

// joinRoom
//
//	@Summary		Join game
//	@Description	Join an existing game via a web socket.
//	@Tags			Games
//	@Router			/api/rooms/{gameID} [get]
func (app *router) joinRoom(w http.ResponseWriter, r *http.Request) {
	_, ok := getUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized.", http.StatusUnauthorized)
		return
	}

	gameIDStr := r.PathValue("gameID")
	if _, err := uuid.Parse(gameIDStr); err != nil {
		http.Error(w, "Invalid game ID.", http.StatusBadRequest)
		return
	}

	// TODO: upgrade to websocket connection and call handlers.JoinRoom.
	// The previous fiber implementation relied on github.com/gofiber/contrib/v3/websocket;
	// this needs to be replaced with a net/http-compatible websocket library
	// (e.g. github.com/coder/websocket or github.com/gorilla/websocket) before wiring
	// this handler back up in router.go.
	http.Error(w, "Not implemented.", http.StatusNotImplemented)
}
