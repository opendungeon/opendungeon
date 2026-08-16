package router

import (
	"io"
	"log/slog"
	"net/http"
	"strconv"

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
func (app *App) getMedia(w http.ResponseWriter, r *http.Request) {
	mediaIDStr := r.PathValue("mediaID")
	mediaID, err := uuid.Parse(mediaIDStr)
	if err != nil {
		http.Error(w, "Invalid media ID.", http.StatusBadRequest)
		return
	}

	conn, err := database.Connect(r.Context())
	if err != nil {
		slog.Error("failed to connect to database", "error", err.Error())
		http.Error(w, "Failed to connect to database.", http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	media, err := handlers.GetMedia(r.Context(), conn, mediaID)
	if err != nil {
		writeHandlerErr(w, err)
		return
	}

	_ = writeJSON(w, http.StatusOK, media)
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
func (app *App) getMediaContent(w http.ResponseWriter, r *http.Request) {
	mediaIDStr := r.PathValue("mediaID")
	mediaID, err := uuid.Parse(mediaIDStr)
	if err != nil {
		http.Error(w, "Invalid media ID.", http.StatusBadRequest)
		return
	}

	conn, err := database.Connect(r.Context())
	if err != nil {
		slog.Error("failed to connect to database", "error", err.Error())
		http.Error(w, "Failed to connect to database.", http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	media, err := handlers.GetMedia(r.Context(), conn, mediaID)
	if err != nil {
		writeHandlerErr(w, err)
		return
	}

	content, err := handlers.GetMediaContent(r.Context(), mediaID)
	if err != nil {
		writeHandlerErr(w, err)
		return
	}

	w.Header().Set("Content-Type", media.ContentType)
	w.Header().Set("Content-Length", strconv.FormatInt(media.Size, 10))
	_, _ = io.Copy(w, content)
}
