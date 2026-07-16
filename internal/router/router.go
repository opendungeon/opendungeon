package router

import (
	"encoding/gob"
	"net/http"
	"net/url"
	"path/filepath"
	"time"

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
	db                  *services.DB
	storage             *services.Storage
	baseURL             *url.URL
	clientURL           *url.URL
	disableUserCreation bool
	discordClientID     string
	discordClientSecret string
}

type Config struct {
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

func New(cfg Config) *fiber.App {
	gob.Register(uuid.UUID{})

	var fc fiber.Config
	fc.Services = append(fc.Services, cfg.DB)
	fc.Services = append(fc.Services, cfg.Storage)

	app := fiber.New(fc)
	r := router{
		db:                  cfg.DB,
		storage:             cfg.Storage,
		baseURL:             cfg.BaseURL,
		clientURL:           cfg.ClientURL,
		disableUserCreation: cfg.DisableUserCreation,
		discordClientID:     cfg.DiscordClientID,
		discordClientSecret: cfg.DiscordClientSecret,
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

	api.Get("/health", func(c fiber.Ctx) error {
		return c.SendStatus(http.StatusOK)
	})

	auth := api.Group("/auth")
	auth.Post("/register", r.registerUser)
	auth.Post("/sign-in", r.signIn)
	auth.Get("/providers", r.listAuthProviders)
	auth.Get("/providers/discord/callback", r.discordCallback)

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

	return app
}

func getUserId(c fiber.Ctx) (uuid.UUID, bool) {
	userId, ok := c.Locals("userId").(uuid.UUID)
	return userId, ok
}
