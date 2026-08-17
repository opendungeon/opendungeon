package handlers

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"

	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/repository"
	"github.com/opendungeon/opendungeon/internal/rooms"
	"github.com/opendungeon/opendungeon/models"
	"modernc.org/sqlite"
	sqlite3 "modernc.org/sqlite/lib"
)

func CreateGame(
	ctx context.Context,
	conn *sql.Conn,
	userId uuid.UUID,
	name string,
) (models.Game, error) {
	repo := repository.New(conn)
	media, err := repo.CreateMedia(ctx, repository.CreateMediaParams{
		Uuid:        uuid.New(),
		ContentType: "application/json",
		Size:        0,
		UserUuid:    userId,
	})
	if err != nil {
		slog.Error("failed to create media", "error", err)
		return models.Game{}, ErrDatabaseFailure
	}

	game, err := repo.CreateGame(ctx, repository.CreateGameParams{
		Uuid:      uuid.New(),
		Name:      name,
		IsActive:  true,
		UserUuid:  userId,
		MediaUuid: media.Uuid, // TODO: actually generate or retrieve the correct game data UUID
	})
	if err != nil {
		sqlErr := new(sqlite.Error)
		if errors.As(err, &sqlErr) {
			if sqlErr.Code() == sqlite3.SQLITE_CONSTRAINT_FOREIGNKEY {
				return models.Game{}, ErrForeignKeyViolation
			}
			if sqlErr.Code() == sqlite3.SQLITE_CONSTRAINT_CHECK {
				return models.Game{}, ErrCheckViolation
			}
		}

		slog.Error("failed to create game", "error", err)
		return models.Game{}, ErrDatabaseFailure
	}

	_, err = repo.CreateGameMaster(ctx, repository.CreateGameMasterParams{
		UserUuid: userId,
		GameUuid: game.Uuid,
	})
	if err != nil {
		sqlErr := new(sqlite.Error)
		if errors.As(err, &sqlErr) {
			if sqlErr.Code() == sqlite3.SQLITE_CONSTRAINT_FOREIGNKEY {
				return models.Game{}, ErrForeignKeyViolation
			}
		}

		slog.Error("failed to create player", "error", err)
		return models.Game{}, ErrDatabaseFailure
	}

	_ = rooms.Create(game.Uuid)
	return models.RepoToGame(game, userId), nil
}

func CreateGamePlayer(
	ctx context.Context,
	conn *sql.Conn,
	gameId uuid.UUID,
	creatorId uuid.UUID,
	userId uuid.UUID,
	permissionLevel string,
) (models.Player, error) {
	repo := repository.New(conn)

	player, err := repo.CreatePlayer(ctx, repository.CreatePlayerParams{
		UserUuid:        userId,
		GameUuid:        gameId,
		PermissionLevel: permissionLevel,
		CreatorUuid:     creatorId,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return models.Player{}, ErrNotFound
		}

		slog.Error("failed to create player", "error", err)
		return models.Player{}, ErrDatabaseFailure
	}

	return models.RepoToPlayer(player, userId), nil
}

func GetGame(
	ctx context.Context,
	conn *sql.Conn,
	userId uuid.UUID,
	gameId uuid.UUID,
) (models.Game, error) {
	repo := repository.New(conn)

	game, err := repo.GetGame(ctx, repository.GetGameParams{
		UserUuid: userId,
		Uuid:     gameId,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return models.Game{}, ErrNotFound
		}

		slog.Error("failed to get game", "error", err)
		return models.Game{}, ErrDatabaseFailure
	}

	return models.RepoToGame(game.Game, game.User.Uuid), nil
}

func ListGames(
	ctx context.Context,
	conn *sql.Conn,
	userId uuid.UUID,
) ([]models.Game, error) {
	repo := repository.New(conn)

	games, err := repo.ListGames(ctx, userId)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return []models.Game{}, nil
		}

		slog.Error("failed to get game", "error", err)
		return nil, ErrDatabaseFailure
	}

	return models.RepoToGames(games), nil
}
