package router

import (
	"net/http"
	"os"
	"strings"
	"time"
)

const spaDefaultPath = "index.html"

type spaFileServer struct {
	root      *os.Root
	startedAt time.Time
}

func newSPAFileServer(staticDir string) (spaFileServer, error) {
	var sfs spaFileServer

	root, err := os.OpenRoot(staticDir)
	if err != nil {
		return sfs, err
	}

	sfs.root = root
	sfs.startedAt = time.Now()
	return sfs, nil
}

// TODO: look into file caching
func (sfs spaFileServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := strings.Trim(r.URL.Path, "/")
	if path == "" {
		path = spaDefaultPath
	}

	fin, err := sfs.root.Open(path)
	if os.IsNotExist(err) {
		index, err := sfs.root.Open(spaDefaultPath)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer index.Close()

		http.ServeContent(w, r, index.Name(), sfs.startedAt, index)
		return
	} else if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer fin.Close()

	http.ServeContent(w, r, fin.Name(), sfs.startedAt, fin)
}
