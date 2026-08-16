package main

import (
	"flag"
	"fmt"
	"log"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/opendungeon/opendungeon/assets"
	"github.com/opendungeon/opendungeon/database"
	"github.com/opendungeon/opendungeon/internal/env"
	"github.com/opendungeon/opendungeon/internal/router"
	"github.com/opendungeon/opendungeon/internal/storage"
	_ "modernc.org/sqlite"
)

const (
	dataDir    = "data"
	storageDir = "storage"
	logDir     = "logs"
	staticDir  = "static"
)

func setupDirectories(baseDir string) error {
	if err := createDirectories(baseDir); err != nil {
		return err
	}

	if err := checkDirPermission(baseDir); err != nil {
		return err
	}

	return nil
}

func createDirectories(baseDir string) error {
	dirs := []string{
		baseDir,
		filepath.Join(baseDir, dataDir),
		filepath.Join(baseDir, storageDir),
		filepath.Join(baseDir, logDir),
		filepath.Join(baseDir, staticDir),
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

//	@title			OpenDungeon
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

	version := "dev" // TODO: generate this at build time (via ARG in dockerfile)

	if err := setupDirectories(baseDir); err != nil {
		log.Fatal(err)
	}

	if err := database.Init(filepath.Join(baseDir, dataDir, "opendungeon.db")); err != nil {
		log.Fatal(err)
	}
	defer database.Close()

	if err := storage.Init(filepath.Join(baseDir, storageDir)); err != nil {
		log.Fatal(err)
	}

	if !isDevMode {
		logName := time.Now().UTC().Format("2006_01_02_15_04_05") + "_UTC.log"
		logPath := filepath.Join(baseDir, logDir, logName)
		logFile, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
		if err != nil {
			log.Fatal(err)
		}
		defer logFile.Close()

		fileHandler := slog.NewTextHandler(logFile, nil)
		outHandler := slog.NewTextHandler(os.Stdout, nil)

		handler := slog.NewMultiHandler(fileHandler, outHandler)
		logger := slog.New(handler)
		slog.SetDefault(logger)
	}

	baseUrlStr := env.Fallback("BASE_URL", "http://localhost:8000")
	baseUrl, err := url.Parse(baseUrlStr)
	if err != nil {
		log.Fatalf("invalid base url: %v", err)
	}

	clientUrlStr := env.Fallback("CLIENT_URL", "http://localhost:5173")
	clientUrl, err := url.Parse(clientUrlStr)
	if err != nil {
		log.Fatalf("invalid client url: %v", err)
	}

	disableUserCreation, _ := env.Get("DISABLE_USER_CREATION")

	discordClientID, _ := env.GetOrSecret("DISCORD_CLIENT_ID")
	discordClientSecret, _ := env.GetOrSecret("DISCORD_CLIENT_SECRET")

	app, err := router.New(router.Config{
		AppVersion:          version,
		IsDevMode:           isDevMode,
		StaticDir:           filepath.Join(baseDir, staticDir),
		BaseURL:             baseUrl,
		ClientURL:           clientUrl,
		DisableUserCreation: disableUserCreation == "true",
		DiscordClientID:     discordClientID,
		DiscordClientSecret: discordClientSecret,
	})
	if err != nil {
		log.Fatalf("failed to create router: %v", err)
	}

	startMessage := new(strings.Builder)
	header, _ := assets.FS.ReadFile("opendungeon.txt")
	if _, err := startMessage.Write(header); err != nil {
		log.Fatal(err)
	}

	environment := "Production"
	if isDevMode {
		environment = "Development"
	}

	addr := fmt.Sprintf(":%d", port)

	startMessage.WriteString("Address: " + addr + "\n")
	startMessage.WriteString("Version: " + version + "\n")
	startMessage.WriteString("Environment: " + environment + "\n")

	if _, err := os.Stdout.WriteString(startMessage.String()); err != nil {
		log.Fatal(err)
	}

	if err := http.ListenAndServe(addr, app); err != nil {
		log.Fatal(err)
	}
}
