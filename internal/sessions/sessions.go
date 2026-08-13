package sessions

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/repository"
)

const TTL = 14 * 24 * time.Hour

var (
	ErrSessionNotFound = errors.New("session not found")
	ErrUserNotFound    = errors.New("user not found")
)

type Session struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	CreatedAt int64
	UpdatedAt int64
	ExpiresAt int64
}

func Create(ctx context.Context, conn *sql.Conn, userID uuid.UUID) (Session, error) {
	repo := repository.New(conn)
	row, err := repo.CreateSession(ctx, repository.CreateSessionParams{
		Uuid:      uuid.New(),
		UserUuid:  userID,
		ExpiresAt: time.Now().Add(TTL).Unix(),
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Session{}, ErrUserNotFound
		}

		return Session{}, fmt.Errorf("failed to extend session: %w", err)
	}

	var session Session
	session.ID = row.Uuid
	session.UserID = userID
	session.CreatedAt = row.CreatedAt
	session.UpdatedAt = row.UpdatedAt
	session.ExpiresAt = row.ExpiresAt

	return session, nil
}

func GetAndExtend(ctx context.Context, conn *sql.Conn, id uuid.UUID) (Session, error) {
	repo := repository.New(conn)
	row, err := repo.GetSession(ctx, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Session{}, ErrSessionNotFound
		}

		return Session{}, fmt.Errorf("failed to get session: %w", err)
	}

	err = repo.ExtendSession(ctx, repository.ExtendSessionParams{
		Uuid:      row.Uuid,
		UserUuid:  row.User.Uuid,
		ExpiresAt: time.Now().Add(TTL).Unix(),
	})
	if err != nil {
		return Session{}, fmt.Errorf("failed to extend session: %w", err)
	}

	var session Session
	session.ID = row.Uuid
	session.UserID = row.User.Uuid
	session.CreatedAt = row.CreatedAt
	session.UpdatedAt = row.UpdatedAt
	session.ExpiresAt = row.ExpiresAt

	return session, nil
}

func DeleteSession(ctx context.Context, conn *sql.Conn, id uuid.UUID, userID uuid.UUID) error {
	repo := repository.New(conn)
	return repo.DeleteSession(ctx, repository.DeleteSessionParams{
		Uuid:     id,
		UserUuid: userID,
	})
}
