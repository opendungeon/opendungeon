package models

import (
	"uuid"
)

type Room struct {
	Players map[uuid.UUID]string `json:"players"`
	Level   *LevelData           `json:"level"`
}
