package rooms

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"sync"
	"sync/atomic"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/opendungeon/opendungeon/database"
	"github.com/opendungeon/opendungeon/internal/messages"
	"github.com/opendungeon/opendungeon/internal/repository"
	"github.com/opendungeon/opendungeon/internal/storage"
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

type Event struct {
	actorID uuid.UUID
	message messages.Message
}

type Room struct {
	ID             uuid.UUID
	ClientCount    atomic.Int32
	Clients        sync.Map
	EventQueue     chan Event
	CreatedAt      atomic.Pointer[time.Time]
	LastDisconnect atomic.Pointer[time.Time]
	Data           models.Room
}

func Create(gameID uuid.UUID) *Room {
	r := &Room{
		ID:         gameID,
		Clients:    sync.Map{},
		EventQueue: make(chan Event),
		Data: models.Room{
			Players: map[uuid.UUID]string{},
		},
	}
	now := time.Now()
	r.CreatedAt.Store(&now)
	go r.start()

	rooms.Store(gameID, r)
	return r
}

func Range(f func(uuid.UUID, *Room) bool) {
	rooms.Range(func(key, value any) bool {
		return f(key.(uuid.UUID), value.(*Room))
	})
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

func (r *Room) Join(ws *websocket.Conn, playerID uuid.UUID, playerName string) {
	existingClient, ok := r.Clients.Load(playerID)
	if ok {
		_ = existingClient.(*Client).Conn.Close()
		r.Clients.Delete(playerID)
	}

	client := Client{
		PlayerID: playerID,
		Room:     r,
		Conn:     ws,
		Send:     make(chan []byte, 256),
	}

	r.Clients.Store(playerID, &client)
	r.ClientCount.Add(1)
	r.Data.Players[playerID] = playerName

	joinMessage := messages.
		NewJoin(0, time.Now(), playerID.String(), playerName).
		Encode()
	r.Clients.Range(func(_, value any) bool {
		client := value.(*Client)
		if client.PlayerID == playerID {
			return true
		}

		client.Send <- joinMessage
		return true
	})

	// setup writer
	go client.WritePump()

	// sync
	syncMessage := messages.
		NewSync(0, time.Now(), r.Data).
		Encode()
	client.Send <- syncMessage

	// setup reader
	client.ReadPump()
}

func (r *Room) DisconnectClient(id uuid.UUID) {
	now := time.Now()
	r.LastDisconnect.Store(&now)
	r.Clients.Delete(id)
	r.ClientCount.Add(-1)
	leaveMessage := messages.NewLeave(0, time.Now(), id.String())
	r.Clients.Range(func(key, value any) bool {
		client := value.(*Client)
		client.Send <- leaveMessage.Encode()
		return true
	})
}

func (r *Room) Close() {
	slog.Info("closing room", "id", r.ID.String())
	// TODO: COMMIT THE GAME DATA TO STORAGE

	r.Clients.Range(func(key, value any) bool {
		client := value.(*Client)
		_ = client.Conn.Close()
		return true
	})

	rooms.Delete(r.ID)
}

func (r *Room) start() {
	for event := range r.EventQueue {
		actorRaw, exists := r.Clients.Load(event.actorID)
		if !exists {
			// actor is no longer connected. ignore
			continue
		}
		actor := actorRaw.(*Client)

		var ok bool
		switch event.message.(type) {
		case *messages.Ack:
			// do nothing, server doesn't listen for client ack
		case *messages.Join:
			// do nothing, only server can issue join
		case *messages.Leave:
			// do nothing, only server can issue leave
		case *messages.Chat:
			ok = r.handleChat(actor, event.message.(*messages.Chat))
		case *messages.Animate:
			// TODO
		case *messages.Move:
			// TODO
		case *messages.Sync:
			// do nothing, only server can issue sync
		case *messages.LoadLevel:
			ok = r.handleLoadLevel(actor, event.message.(*messages.LoadLevel))
		}

		if !ok {
			actor.rejectMessage(event.message.ID())
			continue
		}

		actor.acceptMessage(event.message.ID())
	}
}

func (r *Room) handleChat(actor *Client, msg *messages.Chat) (ok bool) {
	chat := msg.Encode()

	r.Clients.Range(func(_, value any) bool {
		client := value.(*Client)
		if client.PlayerID == actor.PlayerID {
			return true
		}

		client.Send <- chat
		return true
	})

	return true
}

func (r *Room) handleLoadLevel(actor *Client, msg *messages.LoadLevel) (ok bool) {
	levelIDStr := msg.LevelID
	levelID, err := uuid.Parse(levelIDStr)
	if err != nil {
		return false
	}

	ctx := context.Background()
	conn, err := database.Connect(ctx)
	if err != nil {
		return false
	}
	repo := repository.New(conn)

	level, err := repo.GetLevel(ctx, repository.GetLevelParams{
		UserUuid:  actor.PlayerID,
		LevelUuid: levelID,
	})
	_ = conn.Close()
	if err != nil {
		slog.Error("failed to get level in room", "error", err)
		return false
	}

	fin, err := storage.Open(level.Medium.Uuid.String())
	if err != nil {
		slog.Error("failed to open level in room", "error", err)
		return false
	}

	var levelData models.LevelData
	err = json.NewDecoder(fin).Decode(&levelData)
	_ = fin.Close()
	if err != nil {
		slog.Error("failed to decode level", "error", err)
		return false
	}
	r.Data.Level = &levelData

	r.Clients.Range(func(_, value any) bool {
		client := value.(*Client)
		syncMessage := messages.
			NewSync(0, time.Now(), r.Data). // TODO: Generate message ID
			Encode()
		client.Send <- syncMessage
		return true
	})

	return true
}
