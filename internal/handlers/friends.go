package handlers

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"
	"uuid"

	"github.com/opendungeon/opendungeon/internal/repository"
	"github.com/opendungeon/opendungeon/models"
	"modernc.org/sqlite"
	sqlite3 "modernc.org/sqlite/lib"
)

func CreateFriend(
	ctx context.Context,
	conn *sql.Conn,
	userID uuid.UUID,
	targetUsername string,
) (models.Friend, error) {
	repo := repository.New(conn)
	friend, err := repo.CreateFriend(ctx, repository.CreateFriendParams{
		InitiatorUuid:  userID,
		TargetUsername: targetUsername,
	})
	if err != nil {
		sqlErr := new(sqlite.Error)
		if errors.Is(err, sql.ErrNoRows) {
			return models.Friend{}, ErrNotFound
		} else if errors.As(err, &sqlErr) {
			if sqlErr.Code() == sqlite3.SQLITE_CONSTRAINT_FOREIGNKEY {
				return models.Friend{}, ErrForeignKeyViolation
			} else if sqlErr.Code() == sqlite3.SQLITE_CONSTRAINT_CHECK {
				return models.Friend{}, ErrCheckViolation
			} else if sqlErr.Code() == sqlite3.SQLITE_CONSTRAINT_UNIQUE {
				return models.Friend{}, ErrUniqueViolation
			}
		}

		slog.Error("failed to create friend", "error", err)
		return models.Friend{}, ErrDatabaseFailure
	}

	row, err := repo.GetProfile(ctx, friend.TargetUuid)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return models.Friend{}, ErrNotFound
		}

		slog.Error("failed to create friend", "error", err)
		return models.Friend{}, ErrDatabaseFailure
	}

	var avatar *uuid.UUID
	if row.AvatarUuid != nil {
		avatarId := uuid.MustParse(string(row.AvatarUuid))
		avatar = &avatarId
	}

	return models.RepoToFriend(
		userID,
		friend.TargetUuid,
		false,
		friend.CreatedAt,
		friend.CreatedAt,
		models.RepoToProfile(row.Profile, friend.TargetUuid, avatar),
	), nil
}

func AcceptFriend(
	ctx context.Context,
	conn *sql.Conn,
	userID uuid.UUID,
	targetID uuid.UUID,
) error {
	repo := repository.New(conn)
	_, err := repo.AcceptFriend(ctx, repository.AcceptFriendParams{
		UserUuid:   userID,
		TargetUuid: targetID,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		sqlErr := new(sqlite.Error)
		if errors.As(err, &sqlErr) {
			if sqlErr.Code() == sqlite3.SQLITE_CONSTRAINT_FOREIGNKEY {
				return ErrForeignKeyViolation
			}
		}

		slog.Error("failed to accept friend", "error", err)
		return ErrDatabaseFailure
	}

	return nil
}

func DeleteFriend(
	ctx context.Context,
	conn *sql.Conn,
	userID uuid.UUID,
	targetID uuid.UUID,
) error {
	repo := repository.New(conn)
	_, err := repo.DeleteFriend(ctx, repository.DeleteFriendParams{
		UserUuid:   userID,
		TargetUuid: targetID,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		sqlErr := new(sqlite.Error)
		if errors.As(err, &sqlErr) {
			if sqlErr.Code() == sqlite3.SQLITE_CONSTRAINT_FOREIGNKEY {
				return ErrForeignKeyViolation
			}
		}

		slog.Error("failed to delete friend", "error", err)
		return ErrDatabaseFailure
	}

	return nil
}

func ListFriends(
	ctx context.Context,
	conn *sql.Conn,
	userID uuid.UUID,
) ([]models.Friend, error) {
	repo := repository.New(conn)
	friends, err := repo.ListFriends(ctx, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return []models.Friend{}, nil
		}

		slog.Error("failed to get friends", "error", err)
		return nil, ErrDatabaseFailure
	}

	return models.RepoToFriends(friends, userID), nil
}
