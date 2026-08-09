package handlers

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/opendungeon/opendungeon/internal/messages"

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

	profile, err := repo.GetProfile(ctx, userId)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fiber.ErrNotFound
		}

		log.Errorf("failed to get profile: %v", err)
		return fiber.ErrInternalServerError
	}

	room, ok := rooms[game.Uuid]
	if !ok {
		return fiber.ErrInternalServerError
	}

	existingClient, ok := room.Clients[player.Uuid]
	if ok {
		existingClient.Conn.Close()
		delete(room.Clients, player.Uuid)
	}

	client := models.Client{
		ID:   player.Uuid,
		Room: room,
		Conn: ws,
		Send: make(chan []byte, 256),
	}

	room.Clients[player.Uuid] = &client

	joinMessage := (&messages.Join{
		Message: messages.Message{
			ID:     0,
			SentAt: time.Now().Unix(),
		},
		PlayerID:   player.Uuid.String(),
		PlayerName: profile.Profile.Username,
	}).ToBuffer()
	for _, client := range room.Clients {
		if client.ID == player.Uuid {
			continue
		}

		client.Send <- joinMessage
	}

	go client.WritePump()
	client.ReadPump()

	return nil
}
