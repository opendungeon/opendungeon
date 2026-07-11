package handlers

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"net/url"

	"errors"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/database"
	"github.com/opendungeon/opendungeon/internal/providers"
	"github.com/opendungeon/opendungeon/internal/services"
	"golang.org/x/crypto/bcrypt"
	"modernc.org/sqlite"
	sqlite3 "modernc.org/sqlite/lib"
)

func RegisterUser(ctx context.Context, disableUserCreation bool, db *services.DB, email string, password string) (uuid.UUID, error) {
	if disableUserCreation {
		return uuid.Nil, fiber.NewError(fiber.StatusForbidden, "User creation is disabled.")
	}

	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return uuid.Nil, fiber.NewError(fiber.StatusBadRequest, "Password could not be encrypted.")
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
				return uuid.Nil, fiber.NewError(fiber.StatusBadRequest, "Invalid request.")
			}
			if sqlErr.Code() == sqlite3.SQLITE_CONSTRAINT_UNIQUE {
				return uuid.Nil, fiber.NewError(fiber.StatusConflict, "Email already exists.")
			}
		}
		return uuid.Nil, fiber.NewError(fiber.StatusInternalServerError, "Failed to create user.")
	}

	_, err = db.Queries.CreateIdentity(ctx, database.CreateIdentityParams{
		Provider:       "email",
		UserUuid:       user.Uuid,
		PasswordDigest: &passwordDigest,
	})
	if err != nil {
		return uuid.Nil, fiber.NewError(fiber.StatusInternalServerError, "Failed to create identity.")
	}

	return user.Uuid, nil
}

func SignIn(ctx context.Context, db *services.DB, email string, password string) (uuid.UUID, error) {
	identity, err := db.Queries.GetIdentityByEmail(ctx, database.GetIdentityByEmailParams{
		Email:    email,
		Provider: "email",
	})
	if err != nil {
		return uuid.Nil, fiber.NewError(fiber.StatusNotFound, "Failed to find identity.")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(*identity.PasswordDigest), []byte(password)); err != nil {
		return uuid.Nil, fiber.NewError(fiber.StatusNotFound, "Failed to find identity.")
	}

	return identity.UserUuid, nil
}

type AuthProvider struct {
	Name    string `json:"name"`
	AuthURL string `json:"authUrl"`
}

type AuthProviders struct {
	State     string
	Providers []AuthProvider
}

func ListAuthProviders(ctx context.Context, baseUrl *url.URL, discordClientID, discordClientSecret string) (AuthProviders, error) {
	var ap AuthProviders

	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		log.Errorf("failed to generate state: %v", err)
		return ap, fiber.NewError(fiber.StatusInternalServerError, "Failed to generate state.")
	}
	ap.State = hex.EncodeToString(b)

	if discordClientID != "" && discordClientSecret != "" {
		discord := providers.NewDiscord(baseUrl, discordClientID, discordClientSecret)
		ap.Providers = append(ap.Providers, AuthProvider{
			Name:    "Discord",
			AuthURL: discord.AuthUrl(ap.State),
		})
	}

	return ap, nil
}

type CallbackRedirect struct {
	UserID   uuid.UUID
	Redirect *url.URL
}

func DiscordCallback(
	ctx context.Context,
	disableUserCreation bool,
	db *services.DB,
	clientID, clientSecret string,
	baseUrl, clientUrl *url.URL,
	code, state string,
) (CallbackRedirect, error) {
	var cr CallbackRedirect

	discord := providers.NewDiscord(baseUrl, clientID, clientSecret)

	token, err := discord.Exchange(ctx, code)
	if err != nil {
		log.Errorf("failed to exchange auth code with discord: %v", err)
		return cr, fiber.NewError(fiber.StatusPreconditionFailed, "Failed to sign in with discord.")
	}

	discordUser, err := discord.GetUserInfo(ctx, token)
	if err != nil {
		log.Errorf("failed to get user info from discord: %v", err)
		return cr, fiber.NewError(fiber.StatusPreconditionFailed, "Failed to get account info from Discord.")
	}

	// HANDLE EXISTING DISCORD IDENTITY
	identity, err := db.Queries.GetIdentityByEmail(ctx, database.GetIdentityByEmailParams{
		Email:    discordUser.Email,
		Provider: "discord",
	})
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		log.Errorf("failed to retrieve identity from database: %v", err)
		return cr, fiber.NewError(fiber.StatusInternalServerError, "Failed to retrieve identity.")
	}

	identityExists := identity.ProviderUid != nil && *identity.ProviderUid == discordUser.ID
	if identityExists {
		cr.UserID = identity.UserUuid
		cr.Redirect = clientUrl // redirect to home page '/'
		return cr, nil
	}

	// HANDLE EXISTING USER
	existingUser, err := db.Queries.GetUserByEmail(ctx, discordUser.Email)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		log.Errorf("failed to retrieve existing user from database: %v", err)
		return cr, fiber.NewError(fiber.StatusInternalServerError, "Failed to retrieve user.")
	}

	userExists := existingUser.Email == discordUser.Email
	if userExists {
		_, err = db.Queries.CreateIdentity(ctx, database.CreateIdentityParams{
			UserUuid:    existingUser.Uuid,
			Provider:    "discord",
			ProviderUid: &discordUser.ID,
		})
		if err != nil {
			log.Errorf("failed to create identity on existing user: %v", err)
			return cr, fiber.NewError(fiber.StatusInternalServerError, "Failed to create identity.")
		}

		cr.UserID = existingUser.Uuid
		cr.Redirect = clientUrl // redirect to home page '/'
		return cr, nil
	}

	// HANDLE CREATING A NEW USER
	if disableUserCreation {
		return cr, fiber.NewError(fiber.StatusForbidden, "User creation is disabled.")
	}

	user, err := db.Queries.CreateUser(ctx, database.CreateUserParams{
		Uuid:  uuid.New(),
		Email: discordUser.Email,
	})
	if err != nil {
		// no reason to check for database errors here, since the email MUST be unique as
		// we already checked if it exists, AND it must be valid since it came from discord
		log.Errorf("failed to create new user during discord sign in: %v", err)
		return cr, fiber.NewError(fiber.StatusInternalServerError, "Failed to create user.")
	}

	_, err = db.Queries.CreateIdentity(ctx, database.CreateIdentityParams{
		UserUuid:    user.Uuid,
		Provider:    "discord",
		ProviderUid: &discordUser.ID,
	})
	if err != nil {
		log.Errorf("failed to create new identity during discord sign in: %v", err)
		return cr, fiber.NewError(fiber.StatusInternalServerError, "Failed to create identity.")
	}

	_, err = db.Queries.UpsertProfile(ctx, database.UpsertProfileParams{
		UserUuid: user.Uuid,
		Username: discordUser.Username,
		Avatar:   discordUser.AvatarUri,
	})
	if err != nil {
		log.Warn("failed to create profile for discord user: %v", err)
	}

	cr.UserID = user.Uuid
	cr.Redirect = clientUrl.JoinPath("/profiles/me/edit")
	return cr, nil
}
