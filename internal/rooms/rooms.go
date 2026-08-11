package rooms

import (
	"errors"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gofiber/contrib/v3/websocket"
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/messages"
	"github.com/opendungeon/opendungeon/models"
)

const (
	maxMessageSize = 512
	pongWait       = time.Minute
	pingPeriod     = (pongWait * 9) / 10
	writeWait      = 10 * time.Second
)

var (
	ErrRoomNotFound = errors.New("room not found")
	ErrRoomInvalid  = errors.New("room invalid")
)

var rooms sync.Map

type Room struct {
	Clients        map[uuid.UUID]*Client
	Broadcast      chan []byte
	LastDisconnect atomic.Pointer[time.Time]
	Data           models.Room
}

func Create(gameID uuid.UUID) *Room {
	r := &Room{
		Clients:   map[uuid.UUID]*Client{},
		Broadcast: make(chan []byte),
		Data: models.Room{
			Players: map[uuid.UUID]string{},
		},
	}
	go r.start()

	rooms.Store(gameID, r)
	return r
}

func Get(gameID uuid.UUID) (*Room, error) {
	entry, ok := rooms.Load(gameID)
	if !ok {
		return nil, ErrRoomNotFound
	}

	room, ok := entry.(*Room)
	if !ok {
		return nil, ErrRoomInvalid
	}

	return room, nil
}

func (r *Room) start() {
	for message := range r.Broadcast {
		for _, client := range r.Clients {
			if client != nil {
				client.Send <- message
			}
		}
	}
}

func (r *Room) Join(ws *websocket.Conn, playerID uuid.UUID, playerName string) {
	existingClient, ok := r.Clients[playerID]
	if ok {
		_ = existingClient.Conn.Close()
		delete(r.Clients, playerID)
	}

	client := Client{
		PlayerID: playerID,
		Room:     r,
		Conn:     ws,
		Send:     make(chan []byte, 256),
	}

	r.Clients[playerID] = &client
	r.Data.Players[playerID] = playerName

	joinMessage := (&messages.Join{
		Message: messages.Message{
			ID:     0,
			SentAt: time.Now().Unix(),
		},
		PlayerID:   playerID.String(),
		PlayerName: playerName,
	}).ToBuffer()
	for _, client := range r.Clients {
		if client.PlayerID == playerID {
			continue
		}

		client.Send <- joinMessage
	}

	// setup writer
	go client.WritePump()

	// sync
	syncMessage := (&messages.Sync{
		Message: messages.Message{
			ID:     0,
			SentAt: time.Now().Unix(),
		},
		Data: r.Data,
	}).ToBuffer()
	client.Send <- syncMessage

	// setup reader
	client.ReadPump()
}

func (r *Room) DisconnectClient(id uuid.UUID) {
	now := time.Now()
	r.LastDisconnect.Store(&now)
	delete(r.Clients, id)
}
