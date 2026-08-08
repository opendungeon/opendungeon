package handlers

import (
	"context"
	"database/sql"
	"errors"

	"github.com/gofiber/contrib/v3/websocket"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/repository"
	"github.com/opendungeon/opendungeon/models"
)

func JoinGame(
	ctx context.Context,
	ws *websocket.Conn,
	db *sql.Conn,
	rooms map[uuid.UUID]*models.Room,
	userId uuid.UUID,
	gameId uuid.UUID,
) error {
	repo := repository.New(db)
	game, err := repo.GetGame(ctx, repository.GetGameParams{
		UserUuid: userId,
		Uuid:     gameId,
	})
	if err != nil {
		return fiber.ErrNotFound
	}

	if !game.IsActive {
		return fiber.ErrNotFound
	}

	player, err := repo.GetPlayer(ctx, repository.GetPlayerParams{
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

	room, ok := rooms[game.Uuid]
	if !ok {
		return fiber.ErrInternalServerError
	}

	client := models.Client{
		ID:   player.Uuid,
		Room: room,
		Conn: ws,
		Send: make(chan []byte, 256),
	}

	room.Clients[player.Uuid] = &client
	go client.WritePump()
	client.ReadPump()

	return nil
}
