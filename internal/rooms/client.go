package rooms

import (
	"context"
	"encoding/json"
	"time"

	"github.com/gofiber/contrib/v3/websocket"
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/database"
	"github.com/opendungeon/opendungeon/internal/messages"
	"github.com/opendungeon/opendungeon/internal/repository"
	"github.com/opendungeon/opendungeon/internal/storage"
	"github.com/opendungeon/opendungeon/pkg/grid"
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
	}()

	c.Conn.SetReadLimit(maxMessageSize)
	if err := c.Conn.SetReadDeadline(time.Now().Add(pongWait)); err != nil {
		return
	}

	c.Conn.SetPongHandler(func(string) error { _ = c.Conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })
	for {
		_, msg, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}

		switch messages.MessageType(msg[0]) {
		case messages.MessageTypePing:
		case messages.MessageTypeAck:
		case messages.MessageTypeChat:
			chat, err := messages.BufferToChat(msg)
			if err != nil {
				c.rejectMessage(chat.ID)
				continue
			}

			for _, client := range c.Room.Clients {
				if client.PlayerID == c.PlayerID {
					continue
				}

				client.Send <- msg
			}

			c.acceptMessage(chat.ID)
		case messages.MessageTypeAnimate:
		case messages.MessageTypeMove:
		case messages.MessageTypeLoadLevel:
			loadLevel, err := messages.BufferToLoadLevel(msg)
			if err != nil {
				c.rejectMessage(loadLevel.ID)
				continue
			}

			levelUuid, err := uuid.Parse(loadLevel.LevelID)
			if err != nil {
				c.rejectMessage(loadLevel.ID)
				continue
			}

			conn, err := database.Connect(context.Background())
			if err != nil {
				c.rejectMessage(loadLevel.ID)
				continue
			}

			repo := repository.New(conn)

			level, err := repo.GetLevel(context.Background(), repository.GetLevelParams{
				UserUuid:  c.PlayerID,
				LevelUuid: levelUuid,
			})
			_ = conn.Close()
			if err != nil {
				c.rejectMessage(loadLevel.ID)
				continue
			}

			fin, err := storage.Open(level.Medium.Uuid.String())
			if err != nil {
				c.rejectMessage(loadLevel.ID)
				continue
			}

			var levelData grid.SerializedGrid
			err = json.NewDecoder(fin).Decode(&levelData)
			_ = fin.Close()
			if err != nil {
				c.rejectMessage(loadLevel.ID)
				continue
			}
			c.Room.Data.Level = &levelData

			for _, client := range c.Room.Clients {
				syncMessage := (&messages.Sync{
					Message: messages.Message{
						ID:     0, // TODO: Generate message ID
						SentAt: time.Now().Unix(),
					},
					Data: c.Room.Data,
				}).ToBuffer()
				client.Send <- syncMessage
			}

			c.acceptMessage(loadLevel.ID)

		default:
			continue
		}

		c.Room.Broadcast <- msg
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

			n := len(c.Send)
			for i := 0; i < n; i++ {
				if _, err := w.Write([]byte{'\n'}); err != nil {
					continue
				}

				if _, err := w.Write(<-c.Send); err != nil {
					continue
				}
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
	ack := messages.Ack{
		Message: messages.Message{
			ID:     0, // TODO: Generate message ID
			SentAt: time.Now().Unix(),
		},
		PromptID: id,
		Accepted: false,
	}
	ackBuf := ack.ToBuffer()
	c.Send <- ackBuf
}

func (c *Client) acceptMessage(id uint8) {
	ack := messages.Ack{
		Message: messages.Message{
			ID:     0, // TODO: Generate message ID
			SentAt: time.Now().Unix(),
		},
		PromptID: id,
		Accepted: true,
	}
	ackBuf := ack.ToBuffer()
	c.Send <- ackBuf
}
