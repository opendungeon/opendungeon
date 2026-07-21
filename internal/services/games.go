package services

import (
	"context"
	"fmt"
	"sync/atomic"
	"time"

	"github.com/gofiber/contrib/v3/websocket"
	"github.com/google/uuid"
)

const (
	GamesName      = "games"
	maxMessageSize = 512
	pongWait       = time.Minute
	pingPeriod     = (pongWait * 9) / 10
	writeWait      = 10 * time.Second
)

var (
	newline = []byte{'\n'}
)

type GameRoom struct {
	clients        map[uuid.UUID]*GameClient
	broadcast      chan []byte
	lastDisconnect atomic.Pointer[time.Time]
}

func (gr *GameRoom) Start() {
	for message := range gr.broadcast {
		for _, client := range gr.clients {
			if client != nil {
				client.send <- message
			}
		}
	}
}

func (gr *GameRoom) Destroy() {
	close(gr.broadcast)
	for _, client := range gr.clients {
		if client != nil {
			_ = client.conn.Close()
		}
	}
}

func (gr *GameRoom) DisconnectClient(id uuid.UUID) {
	now := time.Now()
	gr.lastDisconnect.Store(&now)
	delete(gr.clients, id)
}

type GameClient struct {
	id       uuid.UUID
	gameRoom *GameRoom
	conn     *websocket.Conn
	send     chan []byte
}

func NewGameClient(gr *GameRoom, conn *websocket.Conn, id uuid.UUID) *GameClient {
	client := &GameClient{
		id:       id,
		gameRoom: gr,
		conn:     conn,
		send:     make(chan []byte, 256),
	}
	gr.clients[id] = client
	return client
}

func (c *GameClient) ReadPump() {
	defer func() {
		_ = c.conn.Close()
		c.gameRoom.DisconnectClient(c.id)
	}()
	c.conn.SetReadLimit(maxMessageSize)
	err := c.conn.SetReadDeadline(time.Now().Add(pongWait))
	if err != nil {
		return
	}
	c.conn.SetPongHandler(func(string) error { _ = c.conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })
	for {
		_, msg, err := c.conn.ReadMessage()
		if err != nil {
			break
		}

		c.gameRoom.broadcast <- msg
	}
}

func (c *GameClient) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
		c.gameRoom.DisconnectClient(c.id)
	}()
	for {
		select {
		case message, ok := <-c.send:
			err := c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err != nil {
				return
			}
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			_, err = w.Write(message)
			if err != nil {
				return
			}

			n := len(c.send)
			for i := 0; i < n; i++ {
				_, err = w.Write(newline)
				if err != nil {
					continue
				}
				_, err = w.Write(<-c.send)
				if err != nil {
					continue
				}
			}

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			err := c.conn.SetWriteDeadline(time.Now().Add(pongWait))
			if err != nil {
				return
			}
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}

}

type Games struct {
	gameRooms map[uuid.UUID]*GameRoom
}

func NewGames() *Games {
	return &Games{
		gameRooms: make(map[uuid.UUID]*GameRoom),
	}
}

func (g *Games) Start(ctx context.Context) error {
	return nil
}

func (g *Games) String() string {
	return GamesName
}

func (g *Games) State(ctx context.Context) (string, error) {
	count := len(g.gameRooms)
	return fmt.Sprintf("Active game rooms: %d", count), nil
}

func (g *Games) Terminate(ctx context.Context) error {
	for _, gr := range g.gameRooms {
		if gr != nil {
			gr.Destroy()
		}
	}
	return nil
}

func (g *Games) Get(id uuid.UUID) (*GameRoom, bool) {
	gr, ok := g.gameRooms[id]
	return gr, ok
}

func (g *Games) Create(id uuid.UUID) *GameRoom {
	gr := &GameRoom{
		clients:   make(map[uuid.UUID]*GameClient),
		broadcast: make(chan []byte, 256),
	}
	g.gameRooms[id] = gr
	return gr
}
