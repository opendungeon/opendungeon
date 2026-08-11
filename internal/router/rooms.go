package router

import (
	"context"

	"github.com/gofiber/contrib/v3/websocket"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/handlers"
)

// joinGame
//
//	@Summary		Join game
//	@Description	Join an existing game via a web socket.
//	@Tags			Games
//	@Router			/api/rooms/{gameID} [get]
func (r *router) joinRoom(c *websocket.Conn) {
	userId, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		_ = c.WriteMessage(websocket.TextMessage, []byte(fiber.ErrUnauthorized.Message))
		_ = c.Close()
		return
	}

	gameIdStr := c.Params("gameID")
	gameId, err := uuid.Parse(gameIdStr)
	if err != nil {
		_ = c.WriteMessage(websocket.TextMessage, []byte(fiber.ErrBadRequest.Message))
		_ = c.Close()
		return
	}

	db, err := r.db.Conn(context.Background())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
		_ = c.WriteMessage(websocket.TextMessage, []byte(fiber.ErrInternalServerError.Message))
		_ = c.Close()
		return
	}
	defer db.Close()

	if err = handlers.JoinRoom(context.Background(), c, db, r.rooms, userId, gameId); err != nil {
		log.Errorf("failed to join game: %v", err)
		_ = c.WriteMessage(websocket.TextMessage, []byte(fiber.ErrInternalServerError.Message))
		_ = c.Close()
		return
	}
}
