package models

import (
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/pkg/grid"
)

type Room struct {
	Players map[uuid.UUID]string `json:"players"`
	Level   *grid.SerializedGrid `json:"level"`
}
