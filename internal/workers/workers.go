package workers

import (
	"context"
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
	lastRunAt time.Time
}

func NewRoomCleaner(interval time.Duration) *RoomCleaner {
	return &RoomCleaner{
		interval:  interval,
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
			cleanupRooms()
			rc.lastRunAt = time.Now()
		}
	}
}

func cleanupRooms() {
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

		if timeSinceLastChange > 10*time.Minute && room.ClientCount.Load() <= 0 {
			room.Close()
		}

		return true
	})
}
