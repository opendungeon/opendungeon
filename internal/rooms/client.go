package rooms

import (
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/opendungeon/opendungeon/internal/messages"
)

type Client struct {
	PlayerID uuid.UUID
	Room     *Room
	Conn     *websocket.Conn
	Send     chan []byte
}

func (c *Client) ReadPump() {
	defer func() {
		_ = c.Conn.Close()
		c.Room.DisconnectClient(c.PlayerID)
		close(c.Send)
	}()

	c.Conn.SetReadLimit(maxMessageSize)
	if err := c.Conn.SetReadDeadline(time.Now().Add(pongWait)); err != nil {
		return
	}

	c.Conn.SetPongHandler(func(string) error { _ = c.Conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })
	for {
		_, b, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}

		if len(b) < 2 {
			c.rejectMessage(0)
			continue
		}
		messageID := uint8(b[1])

		msg, err := messages.Decode(b)
		if err != nil {
			c.rejectMessage(messageID)
			continue
		}

		event := Event{
			actorID: c.PlayerID,
			message: msg,
		}

		c.Room.EventQueue <- event
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		_ = c.Conn.Close()
		c.Room.DisconnectClient(c.PlayerID)
	}()

	for {
		select {
		case message, ok := <-c.Send:
			if err := c.Conn.SetWriteDeadline(time.Now().Add(writeWait)); err != nil {
				return
			}

			if !ok {
				_ = c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.BinaryMessage)
			if err != nil {
				return
			}

			if _, err := w.Write(message); err != nil {
				return
			}

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			if err := c.Conn.SetWriteDeadline(time.Now().Add(pongWait)); err != nil {
				return
			}

			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) rejectMessage(id uint8) {
	ack := messages.NewAck(0, time.Now(), id, false) // TODO: Generate message ID
	ackBuf := ack.Encode()
	c.Send <- ackBuf
}

func (c *Client) acceptMessage(id uint8) {
	ack := messages.NewAck(0, time.Now(), id, true) // TODO: Generate message ID
	ackBuf := ack.Encode()
	c.Send <- ackBuf
}
