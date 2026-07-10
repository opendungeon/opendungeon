package routes

import (
	"net/http"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	recoverer "github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/gofiber/fiber/v3/middleware/session"
	"github.com/gofiber/storage/memory/v2"
	"github.com/opendungeon/opendungeon/internal/services"
)

func Register(r fiber.Router, isDevMode bool) {
	api := r.Group("/api")
	api.Use(recoverer.New())

	api.Use(session.New(session.Config{
		Storage:     memory.New(),
		IdleTimeout: 14 * 24 * time.Hour,
	}))

	if isDevMode {
		api.Use(cors.New(cors.Config{
			AllowOrigins: []string{"*"},
			AllowHeaders: []string{"*"},
			AllowMethods: []string{"*"},
		}))
	}

	levels := api.Group("/levels")
	levels.Post("/", createLevel)
	levels.Get("/:levelId", getLevel)
	levels.Delete("/:levelId", deleteLevel)

	auth := api.Group("/auth")
	auth.Post("/register", registerUser)
	auth.Post("/sign-in", signIn)

	celltextures := api.Group("/cell-textures", requireAuth)
	celltextures.Post("/", createCellTexture)
	celltextures.Get("/", listCellTextures)
	celltextures.Get("/:key", getCellTexture)

	profiles := api.Group("/profiles", requireAuth)
	profiles.Put("/me", upsertProfile)
}

func getDBService(c fiber.Ctx) (*services.DB, error) {
	dbSrv, ok := fiber.GetService[*services.DB](c.App().State(), services.DBName)
	if !ok {
		return nil, c.Status(http.StatusInternalServerError).SendString("Failed to get database service.")
	}

	return dbSrv, nil
}

func getStorageService(c fiber.Ctx) (*services.Storage, error) {
	storageSrv, ok := fiber.GetService[*services.Storage](c.App().State(), services.StorageName)
	if !ok {
		return nil, c.Status(http.StatusInternalServerError).SendString("Failed to get storage service.")
	}

	return storageSrv, nil
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
