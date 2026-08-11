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
	"github.com/opendungeon/opendungeon/internal/rooms"
)

func JoinRoom(
	ctx context.Context,
	ws *websocket.Conn,
	db *sql.Conn,
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

	_, err = repo.GetPlayer(ctx, repository.GetPlayerParams{
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

	room, err := rooms.Get(game.Uuid)
	if err != nil {
		if errors.Is(err, rooms.ErrRoomNotFound) {
			// TODO: If game is explicitly not active, don't allow joining the game. The user currently does not set the game's active state.
			_ = rooms.Create(game.Uuid)
		} else {
			log.Errorf("failed to get room: %v", err)
			return fiber.ErrInternalServerError
		}
	}

	room.Join(ws, userId, profile.Profile.Username)

	return nil
}
