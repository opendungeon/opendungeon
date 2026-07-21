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
//	@Router			/api/ws/  games/{gameID} [get]
func (r *router) joinGame(c *websocket.Conn) {
	userId, ok := c.Locals("userId").(uuid.UUID)
	if !ok {
		c.WriteMessage(websocket.TextMessage, []byte(fiber.ErrUnauthorized.Message))
		c.Close()
		return
	}

	gameIdStr := c.Params("gameID")
	gameId, err := uuid.Parse(gameIdStr)
	if err != nil {
		c.WriteMessage(websocket.TextMessage, []byte(fiber.ErrBadRequest.Message))
		c.Close()
		return
	}

	err = handlers.JoinGame(context.Background(), c, r.db, r.storage, r.games, userId, gameId)
	if err != nil {
		log.Errorf("failed to join game: %v", err)
		c.WriteMessage(websocket.TextMessage, []byte(fiber.ErrInternalServerError.Message))
		c.Close()
		return
	}
}

// createGame
//
//	@Summary		Create game
//	@Description	Create a new game.
//	@Tags			Games
//	@Accept			plain
//	@Produce		json
//	@Param			name	formData	string					true	"Game name"
//	@Param			levelId	formData	string					true	"Level ID for the game"
//	@Success		201		{object}	database.CreateGameRow	"Newly created game details"
//	@Failure		400		{string}	string					"Bad request"
//	@Failure		404		{string}	string					"Not found"
//	@Failure		500		{string}	string					"Server error"
//	@Router			/api/games [post]
func (r *router) createGame(c fiber.Ctx) error {
	userId, ok := getUserId(c)
	if !ok {
		return c.SendStatus(fiber.StatusUnauthorized)
	}

	name := c.FormValue("name")
	levelIdStr := c.FormValue("levelId")
	levelId, err := uuid.Parse(levelIdStr)
	if err != nil {
		return c.SendStatus(fiber.StatusBadRequest)
	}

	game, err := handlers.CreateGame(c.Context(), r.db, r.storage, r.games, userId, levelId, name)
	if err != nil {
		return err
	}

	return c.JSON(game)
}
