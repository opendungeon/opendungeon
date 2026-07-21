package handlers

import (
	"context"
	"errors"

	"github.com/gofiber/contrib/v3/websocket"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/database"
	"github.com/opendungeon/opendungeon/internal/services"
	"modernc.org/sqlite"
	sqlite3 "modernc.org/sqlite/lib"
)

func CreateGame(
	ctx context.Context,
	db *services.DB,
	storage *services.Storage,
	games *services.Games,
	userId uuid.UUID,
	levelId uuid.UUID,
	name string,
) (database.CreateGameRow, error) {
	// TODO: retrieve level and put into game service

	game, err := db.Queries.CreateGame(ctx, database.CreateGameParams{
		Uuid:         uuid.New(),
		Name:         name,
		IsActive:     true,
		UserUuid:     userId,
		LevelUuid:    levelId,
		GameDataUuid: uuid.New(), // TODO: actually generate or retrieve the correct game data UUID
	})
	if err != nil {
		sqlErr := new(sqlite.Error)
		if errors.As(err, &sqlErr) {
			if sqlErr.Code() == sqlite3.SQLITE_CONSTRAINT_FOREIGNKEY {
				return database.CreateGameRow{}, fiber.ErrNotFound
			}
			if sqlErr.Code() == sqlite3.SQLITE_CONSTRAINT_CHECK {
				return database.CreateGameRow{}, fiber.ErrBadRequest
			}
		}

		log.Errorf("failed to create game: %v", err)
		return database.CreateGameRow{}, fiber.ErrInternalServerError
	}

	_, err = db.Queries.CreatePlayer(ctx, database.CreatePlayerParams{
		Uuid:            uuid.New(),
		UserUuid:        userId,
		GameUuid:        game.Uuid,
		PermissionLevel: "game_master",
	})
	if err != nil {
		sqlErr := new(sqlite.Error)
		if errors.As(err, &sqlErr) {
			if sqlErr.Code() == sqlite3.SQLITE_CONSTRAINT_FOREIGNKEY {
				return database.CreateGameRow{}, fiber.ErrNotFound
			}
		}

		log.Errorf("failed to create player: %v", err)
		return database.CreateGameRow{}, fiber.ErrInternalServerError
	}

	gr := games.Create(game.Uuid)
	go gr.Start()

	return game, nil
}

func JoinGame(
	ctx context.Context,
	conn *websocket.Conn,
	db *services.DB,
	storage *services.Storage,
	games *services.Games,
	userId uuid.UUID,
	gameId uuid.UUID,
) error {
	game, err := db.Queries.GetGame(ctx, database.GetGameParams{
		UserUuid: userId,
		Uuid:     gameId,
	})
	if err != nil {
		return fiber.ErrNotFound
	}

	if !game.IsActive {
		return fiber.ErrNotFound
	}

	player, err := db.Queries.GetPlayer(ctx, database.GetPlayerParams{
		UserUuid: userId,
		GameUuid: game.Uuid,
	})
	if err != nil {
		if errors.Is(sql.ErrNoRows, err) {
			return fiber.ErrNotFound
		}
		
		log.Errorf("failed to get player: %v", err)
		return fiber.ErrInternalServerError
	}

	gr, ok := games.Get(game.Uuid)
	if !ok {
		return fiber.ErrInternalServerError
	}

	client := services.NewGameClient(gr, conn, player.Uuid)
	go client.WritePump()
	client.ReadPump()

	return nil
}
