package handlers

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"log/slog"
	"net/url"

	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/providers"
	"github.com/opendungeon/opendungeon/internal/repository"
	"github.com/opendungeon/opendungeon/internal/sessions"
	"golang.org/x/crypto/bcrypt"
	"modernc.org/sqlite"
	sqlite3 "modernc.org/sqlite/lib"
)

func RegisterUser(ctx context.Context, conn *sql.Conn, disableUserCreation bool, email string, password string, isAdmin bool) (sessions.Session, error) {
	if disableUserCreation {
		return sessions.Session{}, ErrUserCreationDisabled
	}

	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return sessions.Session{}, ErrEncryptionFailure
	}
	passwordDigest := string(bytes)

	repo := repository.New(conn)

	user, err := repo.CreateUser(ctx, repository.CreateUserParams{
		Email:   email,
		Uuid:    uuid.New(),
		IsAdmin: isAdmin,
	})
	if err != nil {
		sqlErr := new(sqlite.Error)
		if errors.As(err, &sqlErr) {
			if sqlErr.Code() == sqlite3.SQLITE_CONSTRAINT_CHECK {
				return sessions.Session{}, ErrCheckViolation
			}
			if sqlErr.Code() == sqlite3.SQLITE_CONSTRAINT_UNIQUE {
				return sessions.Session{}, ErrUniqueViolation
			}
		}
		return sessions.Session{}, ErrDatabaseFailure
	}

	_, err = repo.CreateIdentity(ctx, repository.CreateIdentityParams{
		Provider:       "email",
		UserUuid:       user.Uuid,
		PasswordDigest: &passwordDigest,
	})
	if err != nil {
		return sessions.Session{}, ErrDatabaseFailure
	}

	session, err := sessions.Create(ctx, conn, user.Uuid)
	if err != nil {
		return sessions.Session{}, err
	}

	return session, nil
}

func SignIn(ctx context.Context, conn *sql.Conn, email string, password string) (sessions.Session, error) {
	repo := repository.New(conn)

	identity, err := repo.GetIdentityByEmail(ctx, repository.GetIdentityByEmailParams{
		Email:    email,
		Provider: "email",
	})
	if err != nil {
		slog.Warn("attempted sign in to unknown email", "email", email)
		return sessions.Session{}, ErrNotFound
	}

	if err := bcrypt.CompareHashAndPassword([]byte(*identity.PasswordDigest), []byte(password)); err != nil {
		slog.Warn("attempted sign in with incorrect password", "email", email)
		return sessions.Session{}, ErrNotFound
	}

	session, err := sessions.Create(ctx, conn, identity.User.Uuid)
	if err != nil {
		return sessions.Session{}, err
	}

	return session, nil
}

func SignOut(ctx context.Context, conn *sql.Conn, sessionID uuid.UUID, userID uuid.UUID) error {
	return sessions.DeleteSession(ctx, conn, sessionID, userID)
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
		slog.Error("failed to generate state", "error", err.Error())
		return ap, ErrEncryptionFailure
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
	conn *sql.Conn,
	disableUserCreation bool,
	clientID, clientSecret string,
	baseUrl, clientUrl *url.URL,
	code, state string,
) (sessions.Session, error) {
	discord := providers.NewDiscord(baseUrl, clientID, clientSecret)
	discordUser, err := discord.Exchange(ctx, code)
	if err != nil {
		slog.Error("failed to exchange auth code with discord", "error", err.Error())
		return sessions.Session{}, ErrThirdPartyFailure
	}

	repo := repository.New(conn)

	// HANDLE EXISTING DISCORD IDENTITY
	identity, err := repo.GetIdentityByEmail(ctx, repository.GetIdentityByEmailParams{
		Email:    discordUser.Email,
		Provider: "discord",
	})
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		slog.Error("failed to retrieve identity from database", "error", err.Error())
		return sessions.Session{}, ErrDatabaseFailure
	}

	identityExists := identity.ProviderUid != nil && *identity.ProviderUid == discordUser.ID
	if identityExists {
		return sessions.Create(ctx, conn, identity.User.Uuid)
	}

	// HANDLE EXISTING USER
	existingUser, err := repo.GetUserByEmail(ctx, discordUser.Email)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		slog.Error("failed to retrieve existing user from database", "error", err)
		return sessions.Session{}, ErrDatabaseFailure
	}

	userExists := existingUser.Email == discordUser.Email
	if userExists {
		_, err = repo.CreateIdentity(ctx, repository.CreateIdentityParams{
			UserUuid:    existingUser.Uuid,
			Provider:    "discord",
			ProviderUid: &discordUser.ID,
		})
		if err != nil {
			slog.Error("failed to create identity on existing user", "error", err)
			return sessions.Session{}, ErrDatabaseFailure
		}

		return sessions.Create(ctx, conn, existingUser.Uuid)
	}

	// HANDLE CREATING A NEW USER
	if disableUserCreation {
		return sessions.Session{}, ErrUserCreationDisabled
	}

	user, err := repo.CreateUser(ctx, repository.CreateUserParams{
		Uuid:  uuid.New(),
		Email: discordUser.Email,
	})
	if err != nil {
		// no reason to check for database errors here, since the email MUST be unique as
		// we already checked if it exists, AND it must be valid since it came from discord
		slog.Error("failed to create new user during discord sign in", "error", err)
		return sessions.Session{}, ErrDatabaseFailure
	}

	_, err = repo.CreateIdentity(ctx, repository.CreateIdentityParams{
		UserUuid:    user.Uuid,
		Provider:    "discord",
		ProviderUid: &discordUser.ID,
	})
	if err != nil {
		slog.Error("failed to create new identity during discord sign in", "error", err)
		return sessions.Session{}, ErrDatabaseFailure
	}

	avatar, err := providers.GetAvatar(discordUser)
	if err != nil {
		slog.Warn("failed to get user avatar from third party", "error", err)
	}
	defer avatar.Close()

	_, err = UpsertProfile(ctx, conn, user.Uuid, discordUser.Username, avatar)
	if err != nil {
		slog.Warn("failed to create profile for discord user", "error", err)
	}

	return sessions.Create(ctx, conn, user.Uuid)
}
