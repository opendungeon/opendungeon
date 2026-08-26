package models

import (
	"github.com/google/uuid"
)

type RoomPlayer struct {
	Username string `json:"username"`
	Online   bool   `json:"online"`
}

type Room struct {
	Players map[uuid.UUID]RoomPlayer `json:"players"`
	Level   *LevelData               `json:"level"`
}
