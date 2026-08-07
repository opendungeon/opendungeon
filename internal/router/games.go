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
//	@Router			/api/ws/games/{gameID} [get]
func (r *router) joinGame(c *websocket.Conn) {
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

	db, err := r.db.DB.Conn(context.Background())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
		_ = c.WriteMessage(websocket.TextMessage, []byte(fiber.ErrInternalServerError.Message))
		_ = c.Close()
		return
	}
	defer db.Close()

	err = handlers.JoinGame(context.Background(), c, db, r.storage, r.games, userId, gameId)
	if err != nil {
		log.Errorf("failed to join game: %v", err)
		_ = c.WriteMessage(websocket.TextMessage, []byte(fiber.ErrInternalServerError.Message))
		_ = c.Close()
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

	db, err := r.db.DB.Conn(c.Context())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to connect to database.")
	}
	defer db.Close()

	game, err := handlers.CreateGame(c.Context(), db, r.storage, r.games, userId, name)
	if err != nil {
		return err
	}

	return c.JSON(game)
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
func (r *router) createGamePlayer(c fiber.Ctx) error {
	creatorId, ok := getUserId(c)
	if !ok {
		return c.SendStatus(fiber.StatusUnauthorized)
	}

	gameIdStr := c.Params("gameID")
	gameId, err := uuid.Parse(gameIdStr)
	if err != nil {
		return c.SendStatus(fiber.StatusBadRequest)
	}

	userIdStr := c.FormValue("userId")
	userId, err := uuid.Parse(userIdStr)
	if err != nil {
		return c.SendStatus(fiber.StatusBadRequest)
	}

	permissionLevel := c.FormValue("permissionLevel")
	if permissionLevel != "player" && permissionLevel != "game_master" {
		return c.SendStatus(fiber.StatusBadRequest)
	}

	db, err := r.db.DB.Conn(c.Context())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to connect to database.")
	}
	defer db.Close()

	player, err := handlers.CreateGamePlayer(c.Context(), db, gameId, creatorId, userId, permissionLevel)
	if err != nil {
		return err
	}

	return c.Status(fiber.StatusCreated).JSON(player)
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
func (r *router) getGame(c fiber.Ctx) error {
	userId, ok := getUserId(c)
	if !ok {
		return c.SendStatus(fiber.StatusUnauthorized)
	}

	gameIdStr := c.Params("gameID")
	gameId, err := uuid.Parse(gameIdStr)
	if err != nil {
		return c.SendStatus(fiber.StatusBadRequest)
	}

	db, err := r.db.DB.Conn(c.Context())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to connect to database.")
	}
	defer db.Close()

	game, err := handlers.GetGame(c.Context(), db, userId, gameId)
	if err != nil {
		return err
	}

	return c.JSON(game)
}
