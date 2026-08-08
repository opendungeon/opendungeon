package router

import (
	"errors"
	"os"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
)

// getCellTexture
//
//	@Summary		Get avatar
//	@Description	Get an existing avatar.
//	@Tags			Media
//	@Produce		image/png
//	@Param			key	path		string	true	"Key"
//	@Success		200	{file}		binary	"Texture content"
//	@Failure		400	{string}	string	"Bad request"
//	@Failure		404	{string}	string	"Not found"
//	@Failure		500	{string}	string	"Server error"
//	@Router			/api/media/avatars/{avatarID} [get]
func (r *router) getAvatar(c fiber.Ctx) error {
	avatarID := c.Params("avatarID")

	// no handler since this functionality is so small
	scopedKey := "avatar." + avatarID
	fin, err := r.storageDir.Open(scopedKey)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return c.SendStatus(fiber.StatusNotFound)
		}

		log.Errorf("failed to get avatar from storage: %v", err)
		return c.SendStatus(fiber.StatusInternalServerError)
	}

	c.Set("Content-Type", "application/octet-stream")
	return c.SendStream(fin)
}
