package router

import (
	"io"
	"net/http"
	"strconv"

	"github.com/gofiber/fiber/v3/log"
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/database"
	"github.com/opendungeon/opendungeon/internal/handlers"
)

// getMedia
//
//	@Summary		Get media
//	@Description	Get existing media metadata.
//	@Tags			Media
//	@Produce		models.Media
//	@Param			mediaID	path		string	true	"Media ID"
//	@Success		200	{file}		binary	"Media metadata"
//	@Failure		400	{string}	string	"Bad request"
//	@Failure		404	{string}	string	"Not found"
//	@Failure		500	{string}	string	"Server error"
//	@Router			/api/media/{mediaID} [get]
func (app *router) getMedia(w http.ResponseWriter, r *http.Request) {
	mediaIDStr := r.PathValue("mediaID")
	mediaID, err := uuid.Parse(mediaIDStr)
	if err != nil {
		http.Error(w, "Invalid media ID.", http.StatusBadRequest)
		return
	}

	conn, err := database.Connect(r.Context())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
		http.Error(w, "Failed to connect to database.", http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	media, err := handlers.GetMedia(r.Context(), conn, mediaID)
	if err != nil {
		// TODO: handle
	}

	_ = writeJSON(w, media)
}

// getMediaContent
//
//	@Summary		Get media content
//	@Description	Get existing media content.
//	@Tags			Media
//	@Produce		application/octet-stream
//	@Param			mediaID	path		string	true	"Meida ID"
//	@Success		200	{file}		binary	"Media content"
//	@Failure		400	{string}	string	"Bad request"
//	@Failure		404	{string}	string	"Not found"
//	@Failure		500	{string}	string	"Server error"
//	@Router			/api/media/{mediaID}/content [get]
func (app *router) getMediaContent(w http.ResponseWriter, r *http.Request) {
	mediaIDStr := r.PathValue("mediaID")
	mediaID, err := uuid.Parse(mediaIDStr)
	if err != nil {
		http.Error(w, "Invalid media ID.", http.StatusBadRequest)
		return
	}

	conn, err := database.Connect(r.Context())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
		http.Error(w, "Failed to connect to database.", http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	media, err := handlers.GetMedia(r.Context(), conn, mediaID)
	if err != nil {
		// TODO: handle
	}

	content, err := handlers.GetMediaContent(r.Context(), mediaID)
	if err != nil {
		// TODO: handle
	}

	w.Header().Set("Content-Type", media.ContentType)
	w.Header().Set("Content-Length", strconv.FormatInt(media.Size, 10))
	_, _ = io.Copy(w, content)
}
