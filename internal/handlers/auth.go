package handlers

import (
	"context"
	"net/http"

	"errors"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/database"
	"github.com/opendungeon/opendungeon/internal/services"
	"golang.org/x/crypto/bcrypt"
	"modernc.org/sqlite"
	sqlite3 "modernc.org/sqlite/lib"
)

func RegisterUser(ctx context.Context, db *services.DB, email string, password string) (uuid.UUID, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return uuid.Nil, fiber.NewError(http.StatusBadRequest, "Password could not be encrypted.")
	}
	passwordDigest := string(bytes)

	user, err := db.Queries.CreateUser(ctx, database.CreateUserParams{
		Email: email,
		Uuid:  uuid.New(),
	})
	if err != nil {
		sqlErr := new(sqlite.Error)
		if errors.As(err, &sqlErr) {
			if sqlErr.Code() == sqlite3.SQLITE_CONSTRAINT_CHECK {
				return uuid.Nil, fiber.NewError(http.StatusBadRequest, "Invalid request.")
			}
			if sqlErr.Code() == sqlite3.SQLITE_CONSTRAINT_UNIQUE {
				return uuid.Nil, fiber.NewError(http.StatusConflict, "Email already exists.")
			}
		}
		return uuid.Nil, fiber.NewError(http.StatusInternalServerError, "Failed to create user.")
	}

	_, err = db.Queries.CreateIdentity(ctx, database.CreateIdentityParams{
		Provider:       "email",
		UserUuid:       user.Uuid,
		PasswordDigest: &passwordDigest,
	})
	if err != nil {
		return uuid.Nil, fiber.NewError(http.StatusInternalServerError, "Failed to create identity.")
	}

	return user.Uuid, nil
}

func SignIn(ctx context.Context, db *services.DB, email string, password string) (uuid.UUID, error) {
	identity, err := db.Queries.GetIdentityByEmail(ctx, email)
	if err != nil {
		return uuid.Nil, fiber.NewError(http.StatusNotFound, "Failed to find identity.")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(*identity.PasswordDigest), []byte(password)); err != nil {
		return uuid.Nil, fiber.NewError(http.StatusNotFound, "Failed to find identity.")
	}

	return identity.UserUuid, nil
}
