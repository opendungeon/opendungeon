package rooms

import (
	"context"
	"encoding/json"
	"errors"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gofiber/contrib/v3/websocket"
	"github.com/gofiber/fiber/v3/log"
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/database"
	"github.com/opendungeon/opendungeon/internal/messages"
	"github.com/opendungeon/opendungeon/internal/repository"
	"github.com/opendungeon/opendungeon/internal/storage"
	"github.com/opendungeon/opendungeon/models"
	"github.com/opendungeon/opendungeon/pkg/grid"
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
	Clients        map[uuid.UUID]*Client
	EventQueue     chan Event
	LastDisconnect atomic.Pointer[time.Time]
	Data           models.Room
}

func Create(gameID uuid.UUID) *Room {
	r := &Room{
		Clients:    map[uuid.UUID]*Client{},
		EventQueue: make(chan Event),
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
		Header:     messages.NewHeader(0, time.Now().Unix()),
		PlayerID:   playerID.String(),
		PlayerName: playerName,
	}).Encode()
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
		Header: messages.NewHeader(0, time.Now().Unix()),
		Data:   r.Data,
	}).Encode()
	client.Send <- syncMessage

	// setup reader
	client.ReadPump()
}

func (r *Room) DisconnectClient(id uuid.UUID) {
	now := time.Now()
	r.LastDisconnect.Store(&now)
	delete(r.Clients, id)
}

func (r *Room) start() {
	for event := range r.EventQueue {
		actor, exists := r.Clients[event.actorID]
		if !exists {
			// actor is no longer connected. ignore
			continue
		}

		switch event.message.(type) {
		case *messages.Ack:
			// do nothing, server doesn't listen for client ack
		case *messages.Join:
			// do nothing, only server can issue join
		case *messages.Leave:
			// do nothing, only server can issue leave
		case *messages.Chat:
			chat := event.message.Encode()

			for _, client := range r.Clients {
				if client.PlayerID == actor.PlayerID {
					continue
				}

				client.Send <- chat
			}

			actor.acceptMessage(event.message.ID())
		case *messages.Animate:
		case *messages.Move:
		case *messages.Sync:
			// do nothing, only server can issue sync
		case *messages.LoadLevel:
			levelIDStr := event.message.(*messages.LoadLevel).LevelID
			levelID, err := uuid.Parse(levelIDStr)
			if err != nil {
				actor.rejectMessage(event.message.ID())
				continue
			}

			ctx := context.Background()
			conn, err := database.Connect(ctx)
			if err != nil {
				actor.rejectMessage(event.message.ID())
				log.Errorf("failed to connect to database in room: %v", err)
				continue
			}
			repo := repository.New(conn)

			level, err := repo.GetLevel(ctx, repository.GetLevelParams{
				UserUuid:  actor.PlayerID,
				LevelUuid: levelID,
			})
			_ = conn.Close()
			if err != nil {
				actor.rejectMessage(event.message.ID())
				log.Errorf("failed to get level in room: %v", err)
				continue
			}

			fin, err := storage.Open(level.Medium.Uuid.String())
			if err != nil {
				actor.rejectMessage(event.message.ID())
				log.Errorf("failed to open level in room: %v", err)
				continue
			}

			var levelData grid.SerializedGrid
			err = json.NewDecoder(fin).Decode(&level)
			_ = fin.Close()
			if err != nil {
				actor.rejectMessage(event.message.ID())
				log.Errorf("failed to decode level: %v", err)
				continue
			}
			r.Data.Level = &levelData

			for _, client := range r.Clients {
				syncMessage := (&messages.Sync{
					// TODO: Generate message ID
					Header: messages.NewHeader(0, time.Now().Unix()),
					Data:   r.Data,
				}).Encode()
				client.Send <- syncMessage
			}
		}
	}
}
