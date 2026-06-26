package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/gofiber/fiber/v3"
	"github.com/joho/godotenv"
	"github.com/opendungeon/opendungeon/internal/routes"
	"github.com/opendungeon/opendungeon/internal/services"
)

const (
	dataDir    = "data"
	storageDir = "storage"
)

func setupDirectories(baseDir string) error {
	dirs := []string{
		baseDir,
		filepath.Join(baseDir, dataDir),
		filepath.Join(baseDir, storageDir),
	}

	for _, dir := range dirs {
		if err := createDirIfNotExists(dir); err != nil {
			return err
		}
	}

	return nil
}

func createDirIfNotExists(path string) error {
	info, err := os.Stat(path)
	if os.IsNotExist(err) {
		readWriteExecute := os.FileMode(0755)
		err := os.MkdirAll(path, readWriteExecute)
		return err
	}
	if err != nil {
		return err
	}

	if !info.IsDir() {
		return fmt.Errorf("path exists but is not a directory: %s", path)
	}

	return nil
}

func checkDirPermission(path string) error {
	testFile := filepath.Join(path, ".write_test")

	file, err := os.Create(testFile)
	if err != nil {
		return err
	}
	_ = file.Close()

	err = os.Remove(testFile)
	return err
}

//	@title			OpenDungeon API
//	@version		1.0.0
//	@description	Web API for OpenDungeon

//	@servers.url	http://localhost:8000

//	@securityDefinitions.bearerauth	BearerAuth

func main() {
	_ = godotenv.Load()

	portFlag := flag.Int("port", 8000, "service port")
	baseDirFlag := flag.String("baseDir", "/var/lib/opendungeon", "base storage directory")
	devModeFlag := flag.Bool("dev", false, "enable dev mode (dev mode disables CORS)")
	flag.Parse()

	port := 8000
	if portFlag != nil {
		port = *portFlag
	}

	baseDir := "/var/lib/opendungeon"
	if baseDirFlag != nil {
		baseDir = *baseDirFlag
	}

	isDevMode := false
	if devModeFlag != nil {
		isDevMode = *devModeFlag
	}

	if err := setupDirectories(baseDir); err != nil {
		log.Fatal(err)
	}

	if err := checkDirPermission(baseDir); err != nil {
		log.Fatal(err)
	}

	dbSrv, err := services.NewDB(filepath.Join(baseDir, dataDir, "opendungeon.db"))
	if err != nil {
		log.Fatal(err)
	}

	storageSrv := services.NewStorage(filepath.Join(baseDir, storageDir))

	var cfg fiber.Config
	cfg.Services = append(cfg.Services, dbSrv)
	cfg.Services = append(cfg.Services, storageSrv)

	app := fiber.New(cfg)
	routes.Register(app, isDevMode)

	addr := fmt.Sprintf(":%d", port)
	if err := app.Listen(addr); err != nil {
		log.Fatal(err)
	}
}
