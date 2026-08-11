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
	"github.com/gofiber/fiber/v3/log"
	"github.com/gofiber/fiber/v3/middleware/cors"
	recoverer "github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/gofiber/fiber/v3/middleware/session"
	"github.com/gofiber/fiber/v3/middleware/static"
	"github.com/gofiber/storage/memory/v2"
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/database"
	"github.com/opendungeon/opendungeon/internal/middlewares"
	"github.com/opendungeon/opendungeon/internal/repository"
	"github.com/opendungeon/opendungeon/internal/rooms"
)

type router struct {
	version             string
	needsSetup          bool
	baseURL             *url.URL
	clientURL           *url.URL
	disableUserCreation bool
	discordClientID     string
	discordClientSecret string
	rooms               map[uuid.UUID]*rooms.Room
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

func New(cfg Config) (*fiber.App, error) {
	gob.Register(uuid.UUID{})

	app := fiber.New()
	r := router{
		version:             cfg.AppVersion,
		baseURL:             cfg.BaseURL,
		clientURL:           cfg.ClientURL,
		disableUserCreation: cfg.DisableUserCreation,
		discordClientID:     cfg.DiscordClientID,
		discordClientSecret: cfg.DiscordClientSecret,
		rooms:               map[uuid.UUID]*rooms.Room{},
	}

	conn, err := database.Connect(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	repo := repository.New(conn)
	count, err := repo.GetAdminCount(context.Background())
	_ = conn.Close()
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
			AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
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
	admin.Post("/cell-textures", func(c fiber.Ctx) error {
		// TODO: figure out a way to access DB in middleware and move this to the middlewares package

		sess := session.FromContext(c)
		if sess == nil {
			return c.SendStatus(fiber.StatusUnauthorized)
		}

		userID, ok := sess.Get("user_id").(uuid.UUID)
		if !ok {
			return c.SendStatus(fiber.StatusUnauthorized)
		}
		c.Locals("userId", userID)

		db, err := database.Connect(c.Context())
		if err != nil {
			log.Errorf("failed to connect to database: %v", err)
			return c.Status(fiber.StatusInternalServerError).SendString("Failed to connect to database.")
		}
		defer db.Close()

		repo := repository.New(db)
		user, err := repo.GetUser(c.Context(), userID)
		if err != nil {
			return c.SendStatus(fiber.StatusForbidden)
		}

		if !user.IsAdmin {
			return c.SendStatus(fiber.StatusForbidden)
		}

		return c.Next()
	}, r.createCellTexture)

	auth := api.Group("/auth")
	auth.Post("/register", r.registerUser)
	auth.Post("/sign-in", r.signIn)
	auth.Get("/providers", r.listAuthProviders)
	auth.Get("/providers/discord/callback", r.discordCallback)
	auth.Post("/sign-out", r.signOut)

	media := api.Group("/media")
	media.Get("/:mediaID", r.getMedia)
	media.Get("/:mediaID/content", r.getMediaContent)

	users := api.Group("/users", middlewares.Auth)
	users.Get("/me", r.getMyUser)

	celltextures := api.Group("/cell-textures", middlewares.Auth)
	celltextures.Get("/", r.listCellTextures)

	profiles := api.Group("/profiles", middlewares.Auth)
	profiles.Put("/me", r.upsertMyProfile)
	profiles.Get("/me", r.getMyProfile)

	levels := api.Group("/levels", middlewares.Auth)
	levels.Post("/", r.createLevel)
	levels.Get("/", r.listLevels)
	levels.Get("/:levelId", r.getLevel)
	levels.Put("/:levelId", r.updateLevel)

	games := api.Group("/games", middlewares.Auth)
	games.Get("/", r.listGames)
	games.Get("/:gameID", r.getGame)
	games.Post("/", r.createGame)
	games.Post("/:gameID/players", r.createGamePlayer)

	ws := api.Group("/rooms", middlewares.WS)
	ws.Get("/:gameID", websocket.New(r.joinRoom))

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
