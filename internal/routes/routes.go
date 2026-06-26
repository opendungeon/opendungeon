package routes

import (
	"net/http"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	recoverer "github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/opendungeon/opendungeon/internal/services"
)

func Register(r fiber.Router, isDevMode bool) {
	api := r.Group("/api")
	api.Use(recoverer.New())

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

	celltextures := api.Group("cell-textures")
	celltextures.Post("/", createCellTexture)
	celltextures.Get("/", listCellTextures)
	celltextures.Get("/:key", getCellTexture)
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
