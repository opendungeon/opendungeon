package routes

import (
	"net/http"

	"github.com/gofiber/fiber/v3"
	recoverer "github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/opendungeon/opendungeon/internal/services"
)

func Register(r fiber.Router) {
	api := r.Group("/api")
	api.Use(recoverer.New())

	levels := api.Group("/levels")
	levels.Post("/", createLevel)
	levels.Get("/:levelId", getLevel)
	levels.Delete("/:levelId", deleteLevel)

	celltextures := api.Group("cell-textures")
	celltextures.Post("/", createCellTexture)
	celltextures.Get("/:key", getCellTexture)
	celltextures.Get("/", listCellTextures)
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
