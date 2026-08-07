package models

import (
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/repository"
	"github.com/opendungeon/opendungeon/pkg/grid"
)

type Level struct {
	ID        uuid.UUID            `json:"id"`
	Name      string               `json:"name"`
	CreatedAt int64                `json:"createdAt"`
	UpdatedAt int64                `json:"updatedAt"`
	Data      *grid.SerializedGrid `json:"data,omitempty"`
}

func RepoToLevelMetaDatas(l []repository.Level) []Level {
	levels := make([]Level, 0, len(l))
	for _, level := range l {
		levels = append(levels, Level{
			ID:        level.Uuid,
			Name:      level.Name,
			CreatedAt: level.CreatedAt,
			UpdatedAt: level.UpdatedAt,
		})
	}
	return levels
}
