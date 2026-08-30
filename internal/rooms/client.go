package rooms

import (
	"encoding/json"
	"time"
	"uuid"

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

		msg, err := messages.Decode(b)
		if err != nil {
			c.rejectMessage(msg.ID())
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

func (c *Client) rejectMessage(id int) {
	ack := messages.NewAck(0, id, false) // TODO: Generate message ID
	b, _ := json.Marshal(ack)
	c.Send <- b
}

func (c *Client) acceptMessage(id int) {
	ack := messages.NewAck(0, id, true) // TODO: Generate message ID
	b, _ := json.Marshal(ack)
	c.Send <- b
}
