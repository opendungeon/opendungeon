package routes

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
	"github.com/gofiber/fiber/v3/middleware/cors"
	recoverer "github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/gofiber/fiber/v3/middleware/session"
	"github.com/gofiber/fiber/v3/middleware/static"
	"github.com/gofiber/storage/memory/v2"
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/services"
)

func Register(r fiber.Router, isDevMode bool, staticDir string) {
	api := r.Group("/api")
	api.Use(recoverer.New())

	if isDevMode {
		api.Use(cors.New(cors.Config{
			AllowOrigins:     []string{"http://localhost:5173"},
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

	levels := api.Group("/levels")
	levels.Post("/", createLevel)
	levels.Get("/:levelId", getLevel)
	levels.Delete("/:levelId", deleteLevel)

	auth := api.Group("/auth")
	auth.Post("/register", registerUser)
	auth.Post("/sign-in", signIn)
	auth.Get("/providers", listAuthProviders)
	auth.Get("/providers/discord/callback", discordCallback)

	celltextures := api.Group("/cell-textures", requireAuth)
	celltextures.Post("/", createCellTexture)
	celltextures.Get("/", listCellTextures)
	celltextures.Get("/:key", getCellTexture)

	profiles := api.Group("/profiles", requireAuth)
	profiles.Put("/me", upsertMyProfile)
	profiles.Get("/me", getMyProfile)

	// LAST
	if !isDevMode {
		r.Get("/*", static.New(staticDir, static.Config{
			Browse:        true,
			MaxAge:        3600,
			CacheDuration: 7 * 24 * time.Hour,
		}))
	}
}

func getDBService(c fiber.Ctx) (*services.DB, error) {
	dbSrv, ok := fiber.GetService[*services.DB](c.App().State(), services.DBName)
	if !ok {
		log.Error("failed to get database service")
		return nil, c.Status(http.StatusInternalServerError).SendString("Failed to get database service.")
	}

	return dbSrv, nil
}

func getStorageService(c fiber.Ctx) (*services.Storage, error) {
	storageSrv, ok := fiber.GetService[*services.Storage](c.App().State(), services.StorageName)
	if !ok {
		log.Error("failed to get storage service")
		return nil, c.Status(http.StatusInternalServerError).SendString("Failed to get storage service.")
	}

	return storageSrv, nil
}

func getState[T any](c fiber.Ctx, key string) (T, error) {
	var value T

	value, ok := fiber.GetState[T](c.App().State(), key)
	if !ok {
		log.Errorf("failed to get %s state", key)
		message := fmt.Sprintf("Failed to get %s state.", key)
		return value, c.Status(http.StatusInternalServerError).SendString(message)
	}

	return value, nil
}

func getUserId(c fiber.Ctx) (uuid.UUID, error) {
	userIdStr, ok := c.Locals("userId").(string)
	userId, err := uuid.Parse(userIdStr)
	if !ok || err != nil {
		return uuid.Nil, c.SendStatus(fiber.StatusUnauthorized)
	}

	return userId, nil
}

func requireAuth(c fiber.Ctx) error {
	sess := session.FromContext(c)
	if sess == nil {
		return c.SendStatus(http.StatusUnauthorized)
	}

	userId, ok := sess.Get("user_id").(string)
	if !ok {
		return c.SendStatus(http.StatusUnauthorized)
	}

	c.Locals("userId", userId)

	return c.Next()
}
