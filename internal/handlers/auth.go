package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/database"
	"github.com/opendungeon/opendungeon/internal/services"
	"golang.org/x/crypto/bcrypt"
)

const sessionDuration = 14 * 24 * time.Hour

type AccessToken struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expiresAt"`
}

func RegisterUser(ctx context.Context, db *services.DB, email string, password string) (AccessToken, error) {
	var at AccessToken

	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return at, fiber.NewError(http.StatusBadRequest, "Password could not be encrypted.")
	}
	passwordDigest := string(bytes)

	user, err := db.Queries.CreateUser(ctx, database.CreateUserParams{
		Email: email,
		Uuid:  uuid.New(),
	})
	if err != nil {
		// TODO: Check for database error specifics
		return at, fiber.NewError(http.StatusInternalServerError, "Failed to create user.")
	}

	_, err = db.Queries.CreateIdentity(ctx, database.CreateIdentityParams{
		Provider:       "email",
		UserUuid:       user.Uuid,
		PasswordDigest: &passwordDigest,
	})
	if err != nil {
		// TODO: Check for database error specifics
		return at, fiber.NewError(http.StatusInternalServerError, "Failed to create identity.")
	}

	expiry := time.Now().UTC().Add(sessionDuration)
	token, err := createAndSignToken([]byte("your-signing-key-here"), expiry, user.Uuid)
	if err != nil {
		return at, fiber.NewError(http.StatusInternalServerError, "Failed to sign token.")
	}

	at.Token = token
	at.ExpiresAt = expiry

	return at, nil
}

func createAndSignToken(signingKey []byte, expiry time.Time, userId uuid.UUID) (string, error) {
	claims := jwt.RegisteredClaims{
		Issuer:    "opendungeon",
		Subject:   userId.String(),
		ExpiresAt: jwt.NewNumericDate(expiry),
		NotBefore: jwt.NewNumericDate(time.Now().UTC()),
		IssuedAt:  jwt.NewNumericDate(time.Now().UTC()),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(signingKey)
}
