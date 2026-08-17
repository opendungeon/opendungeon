package workers

import (
	"context"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/rooms"
)

type Worker interface {
	LastRunAt() time.Time
	Start(ctx context.Context)
}

type RoomCleaner struct {
	interval  time.Duration
	timeout   time.Duration // the time required for a room to be timed out
	lastRunAt time.Time
}

func NewRoomCleaner(interval, timeout time.Duration) *RoomCleaner {
	return &RoomCleaner{
		interval:  interval,
		timeout:   timeout,
		lastRunAt: time.Time{},
	}
}

func (rc *RoomCleaner) LastRunAt() time.Time {
	return rc.lastRunAt
}

func (rc *RoomCleaner) Start(ctx context.Context) {
	ticker := time.NewTicker(rc.interval)

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			rc.cleanupRooms()
			rc.lastRunAt = time.Now()
		}
	}
}

func (rc *RoomCleaner) cleanupRooms() {
	rooms.Range(func(id uuid.UUID, room *rooms.Room) bool {
		createdAt := *room.CreatedAt.Load()

		var lastDisconnect time.Time
		if ld := room.LastDisconnect.Load(); ld != nil {
			lastDisconnect = *ld
		} else {
			lastDisconnect = time.Time{}
		}

		var timeSinceLastChange time.Duration
		if createdAt.After(lastDisconnect) {
			timeSinceLastChange = time.Now().Sub(createdAt)
		} else {
			timeSinceLastChange = time.Now().Sub(lastDisconnect)
		}

		if timeSinceLastChange > rc.timeout && room.ClientCount.Load() <= 0 {
			room.Close()
		}

		return true
	})
}
