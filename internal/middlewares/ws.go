package middlewares

import (
	"github.com/gofiber/contrib/v3/websocket"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/session"
	"github.com/google/uuid"
)

func WS(c fiber.Ctx) error {
	if !websocket.IsWebSocketUpgrade(c) {
		return fiber.ErrUpgradeRequired
	}

	sess := session.FromContext(c)
	if sess == nil {
		return c.SendStatus(fiber.StatusUnauthorized)
	}

	userId, ok := sess.Get("user_id").(uuid.UUID)
	if !ok {
		return c.SendStatus(fiber.StatusUnauthorized)
	}

	c.Locals("userId", userId)

	return c.Next()
}
