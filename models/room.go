package models

import (
	"uuid"
)

type RoomPlayer struct {
	Username string `json:"username"`
	Online   bool   `json:"online"`
}

type RoomCharacter struct {
	MediaID uuid.UUID `json:"mediaId"`
	X       int       `json:"x"`
	Y       int       `json:"y"`
}

type Room struct {
	Players    map[uuid.UUID]RoomPlayer `json:"players"`
	Level      *LevelData               `json:"level"`
	Characters []RoomCharacter          `json:"characters"`
}
