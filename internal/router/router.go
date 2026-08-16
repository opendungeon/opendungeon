package router

import (
	"context"
	"encoding/gob"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/opendungeon/opendungeon/database"
	"github.com/opendungeon/opendungeon/internal/handlers"
	"github.com/opendungeon/opendungeon/internal/middlewares"
	"github.com/opendungeon/opendungeon/internal/repository"
	"github.com/opendungeon/opendungeon/internal/sessions"
)

type App struct {
	version             string
	needsSetup          bool
	baseURL             *url.URL
	clientURL           *url.URL
	disableUserCreation bool
	discordClientID     string
	discordClientSecret string
	cookieSameSite      http.SameSite
	wsUpgrader          websocket.Upgrader
}

type Config struct {
	AppVersion          string
	IsDevMode           bool
	StaticDir           string
	BaseURL             *url.URL
	ClientURL           *url.URL
	DisableUserCreation bool
	DiscordClientID     string
	DiscordClientSecret string
}

func New(cfg Config) (http.Handler, error) {
	gob.Register(uuid.UUID{})

	adminCount, err := getAdminCount()
	if err != nil {
		return nil, err
	}

	mux := http.NewServeMux()
	app := App{
		version:             cfg.AppVersion,
		baseURL:             cfg.BaseURL,
		clientURL:           cfg.ClientURL,
		disableUserCreation: cfg.DisableUserCreation,
		discordClientID:     cfg.DiscordClientID,
		discordClientSecret: cfg.DiscordClientSecret,
		cookieSameSite:      http.SameSiteStrictMode,
		needsSetup:          adminCount < 1,
		wsUpgrader: websocket.Upgrader{
			ReadBufferSize:  4096, // 4KB
			WriteBufferSize: 4096,
		},
	}

	// meta routes
	mux.Handle("GET /api/status", http.HandlerFunc(app.getStatus))

	// admin routes
	mux.Handle("POST /api/admin/register", http.HandlerFunc(app.registerAdminUser))
	mux.Handle("POST /api/admin/cell-textures", middlewares.Admin(http.HandlerFunc(app.createCellTexture)))

	// auth routes
	mux.Handle("POST /api/auth/register", http.HandlerFunc(app.registerUser))
	mux.Handle("POST /api/auth/sign-in", http.HandlerFunc(app.signIn))
	mux.Handle("GET /api/auth/providers", http.HandlerFunc(app.listAuthProviders))
	mux.Handle("GET /api/auth/providers/discord/callback", http.HandlerFunc(app.discordCallback))
	mux.Handle("POST /api/auth/sign-out", middlewares.Auth(http.HandlerFunc(app.signOut)))

	// media routes
	mux.Handle("GET /api/media/{mediaID}", http.HandlerFunc(app.getMedia))
	mux.Handle("GET /api/media/{mediaID}/content", http.HandlerFunc(app.getMediaContent))

	// user routes
	mux.Handle("GET /api/users/me", middlewares.Auth(http.HandlerFunc(app.getMyUser)))

	// cell texture routes
	mux.Handle("GET /api/cell-textures", middlewares.Auth(http.HandlerFunc(app.listCellTextures)))

	// profile routes
	mux.Handle("PUT /api/profiles/me", middlewares.Auth(http.HandlerFunc(app.upsertMyProfile)))
	mux.Handle("GET /api/profiles/me", middlewares.Auth(http.HandlerFunc(app.getMyProfile)))

	// level routes
	mux.Handle("POST /api/levels", middlewares.Auth(http.HandlerFunc(app.createLevel)))
	mux.Handle("GET /api/levels", middlewares.Auth(http.HandlerFunc(app.listLevels)))
	mux.Handle("GET /api/levels/{levelID}", middlewares.Auth(http.HandlerFunc(app.getLevel)))
	mux.Handle("PUT /api/levels/{levelID}", middlewares.Auth(http.HandlerFunc(app.updateLevel)))

	// game routes
	mux.Handle("POST /api/games", middlewares.Auth(http.HandlerFunc(app.createGame)))
	mux.Handle("GET /api/games", middlewares.Auth(http.HandlerFunc(app.listGames)))
	mux.Handle("GET /api/games/{gameID}", middlewares.Auth(http.HandlerFunc(app.getGame)))
	mux.Handle("POST /api/games/{gameID}/players", middlewares.Auth(http.HandlerFunc(app.createGamePlayer)))

	// room routes
	mux.Handle("GET /api/rooms/{gameID}", middlewares.Auth(http.HandlerFunc(app.joinRoom)))

	// MUST GO LAST
	if !cfg.IsDevMode {
		// TODO: look into caching
		fs := http.FileServer(http.Dir(cfg.StaticDir))
		mux.Handle("/", fs)
	} else {
		app.cookieSameSite = http.SameSiteLaxMode
		app.wsUpgrader.CheckOrigin = func(r *http.Request) bool {
			return true
		}
		var handler http.Handler = mux
		return middlewares.CORS(handler), nil
	}

	return mux, nil
}

func getAdminCount() (int64, error) {
	conn, err := database.Connect(context.Background())
	if err != nil {
		return 0, fmt.Errorf("failed to connect to database: %w", err)
	}

	repo := repository.New(conn)
	count, err := repo.GetAdminCount(context.Background())
	_ = conn.Close()
	if err != nil {
		return 0, fmt.Errorf("failed to get admin count: %v", err)
	}

	return count, nil
}

func getSessionID(ctx context.Context) (uuid.UUID, bool) {
	sessionID, ok := ctx.Value(sessions.SessionKey).(uuid.UUID)
	return sessionID, ok
}

func getUserID(ctx context.Context) (uuid.UUID, bool) {
	userID, ok := ctx.Value(sessions.UserKey).(uuid.UUID)
	return userID, ok
}

func (app *App) createCookie(name, value string) *http.Cookie {
	cookie := http.Cookie{
		Name:     name,
		Value:    value,
		Path:     "/",
		Domain:   app.baseURL.Hostname(),
		HttpOnly: true,
		SameSite: app.cookieSameSite,
	}

	return &cookie
}

func (app *App) deleteCookie(name string) *http.Cookie {
	cookie := http.Cookie{
		Name:     name,
		Value:    "",
		Path:     "/",
		Domain:   app.baseURL.String(),
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		SameSite: app.cookieSameSite,
	}

	return &cookie
}

func writeString(w http.ResponseWriter, status int, s string) error {
	w.WriteHeader(status)
	_, err := io.WriteString(w, s)
	return err
}

func writeJSON(w http.ResponseWriter, status int, v any) error {
	w.WriteHeader(status)
	return json.NewEncoder(w).Encode(v)
}

func writeHandlerErr(w http.ResponseWriter, e error) {
	status := http.StatusInternalServerError

	switch {
	case errors.Is(e, handlers.ErrUserCreationDisabled):
		status = http.StatusBadRequest
	case errors.Is(e, handlers.ErrEncryptionFailure):
		status = http.StatusInternalServerError
	case errors.Is(e, handlers.ErrCheckViolation):
		status = http.StatusBadRequest
	case errors.Is(e, handlers.ErrUniqueViolation):
		status = http.StatusConflict
	case errors.Is(e, handlers.ErrForeignKeyViolation):
		status = http.StatusNotFound
	case errors.Is(e, handlers.ErrDatabaseFailure):
		status = http.StatusInternalServerError
	case errors.Is(e, handlers.ErrNotFound):
		status = http.StatusNotFound
	case errors.Is(e, handlers.ErrThirdPartyFailure):
		status = http.StatusPreconditionFailed
	case errors.Is(e, handlers.ErrValidationFailure):
		status = http.StatusBadRequest
	case errors.Is(e, handlers.ErrUnsupportedFormat):
		status = http.StatusUnsupportedMediaType
	case errors.Is(e, handlers.ErrStorageFailure):
		status = http.StatusInternalServerError
	case errors.Is(e, handlers.ErrInvalidRequestFormat):
		status = http.StatusBadRequest
	case errors.Is(e, handlers.ErrConvertFailure):
		status = http.StatusInternalServerError
	case errors.Is(e, handlers.ErrRoomFailure):
		status = http.StatusInternalServerError
	}

	http.Error(w, http.StatusText(status), status)
}

type APIStatus struct {
	Status     string `json:"status"`
	Version    string `json:"version"`
	NeedsSetup bool   `json:"needsSetup"`
}

// getStatus
//
//	@Summary		Get status
//	@Description	Get API status and information
//	@Produce		json
//	@Success		200	{object}	APIStatus
//	@Router			/api/status [get]
func (app *App) getStatus(w http.ResponseWriter, r *http.Request) {
	var status APIStatus
	status.Status = "OK"
	status.Version = app.version
	status.NeedsSetup = app.needsSetup

	_ = writeJSON(w, http.StatusOK, status)
}
