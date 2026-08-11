package router

import (
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
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
func (r *router) createGame(c fiber.Ctx) error {
	userId, ok := getUserId(c)
	if !ok {
		return c.SendStatus(fiber.StatusUnauthorized)
	}

	name := c.FormValue("name")

	db, err := database.Connect(c.Context())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to connect to database.")
	}
	defer db.Close()

	game, err := handlers.CreateGame(c.Context(), db, userId, name)
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

	db, err := database.Connect(c.Context())
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

	db, err := database.Connect(c.Context())
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
func (r *router) listGames(c fiber.Ctx) error {
	userId, ok := getUserId(c)
	if !ok {
		return c.SendStatus(fiber.StatusUnauthorized)
	}

	db, err := database.Connect(c.Context())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to connect to database.")
	}
	defer db.Close()

	games, err := handlers.ListGames(c.Context(), db, userId)
	if err != nil {
		return err
	}

	return c.JSON(games)
}
