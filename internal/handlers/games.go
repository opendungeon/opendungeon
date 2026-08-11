package handlers

import (
	"context"
	"database/sql"
	"errors"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
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
		log.Errorf("failed to create media: %v", err)
		return models.Game{}, fiber.ErrInternalServerError
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
				return models.Game{}, fiber.ErrNotFound
			}
			if sqlErr.Code() == sqlite3.SQLITE_CONSTRAINT_CHECK {
				return models.Game{}, fiber.ErrBadRequest
			}
		}

		log.Errorf("failed to create game: %v", err)
		return models.Game{}, fiber.ErrInternalServerError
	}

	_, err = repo.CreateGameMaster(ctx, repository.CreateGameMasterParams{
		UserUuid: userId,
		GameUuid: game.Uuid,
	})
	if err != nil {
		sqlErr := new(sqlite.Error)
		if errors.As(err, &sqlErr) {
			if sqlErr.Code() == sqlite3.SQLITE_CONSTRAINT_FOREIGNKEY {
				return models.Game{}, fiber.ErrNotFound
			}
		}

		log.Errorf("failed to create player: %v", err)
		return models.Game{}, fiber.ErrInternalServerError
	}

	_ = rooms.Create(game.Uuid)
	return models.RepoToGame(game), nil
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
			return models.Player{}, fiber.ErrNotFound
		}

		log.Errorf("failed to create player: %v", err)
		return models.Player{}, fiber.ErrInternalServerError
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
			return models.Game{}, fiber.ErrNotFound
		}

		log.Errorf("failed to get game: %v", err)
		return models.Game{}, fiber.ErrInternalServerError
	}

	return models.RepoToGame(game), nil
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
			return nil, fiber.ErrNotFound
		}

		log.Errorf("failed to get game: %v", err)
		return nil, fiber.ErrInternalServerError
	}

	return models.RepoToGames(games), nil
}
