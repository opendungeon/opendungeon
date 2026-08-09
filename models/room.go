package models

import (
	"sync/atomic"
	"time"

	"github.com/gofiber/contrib/v3/websocket"
	"github.com/gofiber/fiber/v3/log"
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/messages"
)

const (
	maxMessageSize = 512
	pongWait       = time.Minute
	pingPeriod     = (pongWait * 9) / 10
	writeWait      = 10 * time.Second
)

type Room struct {
	Clients        map[uuid.UUID]*Client
	Broadcast      chan []byte
	LastDisconnect atomic.Pointer[time.Time]
}

func (r *Room) Start() {
	for message := range r.Broadcast {
		for _, client := range r.Clients {
			if client != nil {
				client.Send <- message
			}
		}
	}
}

func (r *Room) DisconnectClient(id uuid.UUID) {
	now := time.Now()
	r.LastDisconnect.Store(&now)
	delete(r.Clients, id)
}

type Client struct {
	ID   uuid.UUID
	Room *Room
	Conn *websocket.Conn
	Send chan []byte
}

func (c *Client) ReadPump() {
	defer func() {
		_ = c.Conn.Close()
		c.Room.DisconnectClient(c.ID)
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
				ack := messages.Ack{
					Message: messages.Message{
						ID:     0, // TODO: Generate message ID
						SentAt: time.Now().Unix(),
					},
					PromptID: chat.ID,
					Accepted: false,
				}
				ackBuf := ack.ToBuffer()
				c.Send <- ackBuf

				continue
			}

			for _, client := range c.Room.Clients {
				if client.ID == c.ID {
					continue
				}

				client.Send <- msg
			}

			ack := messages.Ack{
				Message: messages.Message{
					ID:     0, // TODO: Generate message ID
					SentAt: time.Now().Unix(),
				},
				PromptID: chat.ID,
				Accepted: true,
			}
			ackBuf := ack.ToBuffer()
			c.Send <- ackBuf
		case messages.MessageTypeAnimate:
		case messages.MessageTypeMove:
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
		c.Room.DisconnectClient(c.ID)
	}()

	for {
		select {
		case message, ok := <-c.Send:
			log.Info("WritePump: sending message to client")
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
