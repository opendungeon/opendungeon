package handlers

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/opendungeon/opendungeon/internal/repository"
	"github.com/opendungeon/opendungeon/internal/rooms"
)

func JoinRoom(
	ctx context.Context,
	ws *websocket.Conn,
	db *sql.Conn,
	userID uuid.UUID,
	gameID uuid.UUID,
) error {
	repo := repository.New(db)
	game, err := repo.GetGame(ctx, repository.GetGameParams{
		UserUuid: userID,
		Uuid:     gameID,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}

		slog.Error("failed to get game", "error", err)
		return ErrDatabaseFailure
	}

	if !game.Game.IsActive {
		return ErrNotFound
	}

	_, err = repo.GetPlayer(ctx, repository.GetPlayerParams{
		UserUuid: userID,
		GameUuid: game.Game.Uuid,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}

		slog.Error("failed to get player", "error", err)
		return ErrDatabaseFailure
	}

	profile, err := repo.GetProfile(ctx, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}

		slog.Error("failed to get profile", "error", err)
		return ErrDatabaseFailure
	}

	room, err := rooms.Get(game.Game.Uuid)
	if err != nil {
		if errors.Is(err, rooms.ErrRoomNotFound) {
			// TODO: If game is explicitly not active, don't allow joining the game. The user currently does not set the game's active state.
			room = rooms.Create(game.Game.Uuid)
		} else {
			slog.Error("failed to get room", "error", err)
			return ErrRoomFailure
		}
	}

	room.Join(ws, userID, profile.Profile.Username)

	return nil
}
