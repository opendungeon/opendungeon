package router

import (
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
	"github.com/google/uuid"
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
func (r *router) getMedia(c fiber.Ctx) error {
	mediaIDStr := c.Params("mediaID")
	mediaID, err := uuid.Parse(mediaIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).SendString("Invalid media ID.")
	}

	db, err := r.db.Conn(c.Context())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to connect to database.")
	}
	defer db.Close()

	media, err := handlers.GetMedia(c.Context(), db, mediaID)
	if err != nil {
		return err
	}

	return c.JSON(media)
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
func (r *router) getMediaContent(c fiber.Ctx) error {
	mediaIDStr := c.Params("mediaID")
	mediaID, err := uuid.Parse(mediaIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).SendString("Invalid media ID.")
	}

	db, err := r.db.Conn(c.Context())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to connect to database.")
	}
	defer db.Close()

	media, err := handlers.GetMedia(c.Context(), db, mediaID)
	if err != nil {
		return err
	}

	content, err := handlers.GetMediaContent(c.Context(), r.storageDir, mediaID)
	if err != nil {
		return err
	}

	c.Set("Content-Type", media.ContentType)
	return c.SendStream(content, int(media.Size))
}
