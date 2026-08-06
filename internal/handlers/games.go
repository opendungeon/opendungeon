package handlers

import (
	"context"
	"database/sql"
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
	name string,
) (database.CreateGameRow, error) {

	game, err := db.Queries.CreateGame(ctx, database.CreateGameParams{
		Uuid:         uuid.New(),
		Name:         name,
		IsActive:     true,
		UserUuid:     userId,
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

	_, err = db.Queries.CreateGameMaster(ctx, database.CreateGameMasterParams{
		Uuid:     uuid.New(),
		UserUuid: userId,
		GameUuid: game.Uuid,
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
		if errors.Is(err, sql.ErrNoRows) {
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

func CreateGamePlayer(
	ctx context.Context,
	db *services.DB,
	gameId uuid.UUID,
	creatorId uuid.UUID,
	userId uuid.UUID,
	permissionLevel string,
) (database.CreatePlayerRow, error) {
	player, err := db.Queries.CreatePlayer(ctx, database.CreatePlayerParams{
		Uuid:            uuid.New(),
		UserUuid:        userId,
		GameUuid:        gameId,
		PermissionLevel: permissionLevel,
		CreatorUuid:     creatorId,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return database.CreatePlayerRow{}, fiber.ErrNotFound
		}

		log.Errorf("failed to create player: %v", err)
		return database.CreatePlayerRow{}, fiber.ErrInternalServerError
	}

	return player, nil
}

func GetGame(
	ctx context.Context,
	db *services.DB,
	userId uuid.UUID,
	gameId uuid.UUID,
) (database.GetGameRow, error) {
	game, err := db.Queries.GetGame(ctx, database.GetGameParams{
		UserUuid: userId,
		Uuid:     gameId,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return database.GetGameRow{}, fiber.ErrNotFound
		}

		log.Errorf("failed to get game: %v", err)
		return database.GetGameRow{}, fiber.ErrInternalServerError
	}

	return game, nil
}
