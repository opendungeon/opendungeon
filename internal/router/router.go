package router

import (
	"context"
	"encoding/gob"
	"fmt"
	"net/url"
	"path/filepath"
	"time"

	"github.com/gofiber/contrib/v3/websocket"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	recoverer "github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/gofiber/fiber/v3/middleware/session"
	"github.com/gofiber/fiber/v3/middleware/static"
	"github.com/gofiber/storage/memory/v2"
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/middlewares"
	"github.com/opendungeon/opendungeon/internal/services"
)

type router struct {
	version             string
	needsSetup          bool
	db                  *services.DB
	storage             *services.Storage
	baseURL             *url.URL
	clientURL           *url.URL
	disableUserCreation bool
	discordClientID     string
	discordClientSecret string
	games               *services.Games
}

type Config struct {
	AppVersion          string
	IsDevMode           bool
	StaticDir           string
	DB                  *services.DB
	Storage             *services.Storage
	BaseURL             *url.URL
	ClientURL           *url.URL
	DisableUserCreation bool
	DiscordClientID     string
	DiscordClientSecret string
}

func New(cfg Config) (*fiber.App, error) {
	gob.Register(uuid.UUID{})

	var fc fiber.Config
	gs := services.NewGames()
	fc.Services = append(fc.Services, cfg.DB)
	fc.Services = append(fc.Services, cfg.Storage)
	fc.Services = append(fc.Services, gs)

	app := fiber.New(fc)
	r := router{
		version:             cfg.AppVersion,
		db:                  cfg.DB,
		storage:             cfg.Storage,
		baseURL:             cfg.BaseURL,
		clientURL:           cfg.ClientURL,
		disableUserCreation: cfg.DisableUserCreation,
		discordClientID:     cfg.DiscordClientID,
		discordClientSecret: cfg.DiscordClientSecret,
		games:               gs,
	}

	count, err := cfg.DB.Queries.GetAdminCount(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed to get admin count: %v", err)
	}
	hasNoAdmins := count < 1
	if hasNoAdmins {
		r.needsSetup = true
	}

	app.Use(recoverer.New())
	api := app.Group("/api")

	if cfg.IsDevMode {
		api.Use(cors.New(cors.Config{
			AllowOrigins:     []string{cfg.ClientURL.String()},
			AllowHeaders:     []string{"*"},
			AllowCredentials: true,
		}))
	}

	api.Use(session.New(session.Config{
		Storage:     memory.New(),
		IdleTimeout: 14 * 24 * time.Hour,
	}))

	api.Get("/status", r.getStatus)

	admin := api.Group("/admin")
	admin.Post("/register", r.registerAdminUser)

	auth := api.Group("/auth")
	auth.Post("/register", r.registerUser)
	auth.Post("/sign-in", r.signIn)
	auth.Get("/providers", r.listAuthProviders)
	auth.Get("/providers/discord/callback", r.discordCallback)
	auth.Post("/sign-out", r.signOut)

	media := api.Group("/media")
	media.Get("/avatars/:avatarID", r.getAvatar)

	celltextures := api.Group("/cell-textures", middlewares.Auth)
	celltextures.Post("/", r.createCellTexture)
	celltextures.Get("/", r.listCellTextures)
	celltextures.Get("/:key", r.getCellTexture)

	profiles := api.Group("/profiles", middlewares.Auth)
	profiles.Put("/me", r.upsertMyProfile)
	profiles.Get("/me", r.getMyProfile)

	levels := api.Group("/levels", middlewares.Auth)
	levels.Post("/", r.createLevel)
	levels.Get("/", r.listLevels)
	levels.Get("/:levelId", r.getLevel)

	games := api.Group("/games", middlewares.Auth)
	games.Post("/", r.createGame)

	ws := api.Group("/ws", middlewares.WS)
	ws.Get("/games/:gameID", websocket.New(r.joinGame))

	// MUST GO LAST
	if !cfg.IsDevMode {
		app.Get("/*", static.New(cfg.StaticDir, static.Config{
			MaxAge:        3600,
			CacheDuration: 7 * 24 * time.Hour,
			NotFoundHandler: func(c fiber.Ctx) error {
				return c.SendFile(filepath.Join(cfg.StaticDir, "index.html"))
			},
		}))
	}

	return app, nil
}

func getUserId(c fiber.Ctx) (uuid.UUID, bool) {
	userId, ok := c.Locals("userId").(uuid.UUID)
	return userId, ok
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
func (r *router) getStatus(c fiber.Ctx) error {
	var status APIStatus
	status.Status = "OK"
	status.Version = r.version
	status.NeedsSetup = r.needsSetup

	return c.JSON(status)
}
