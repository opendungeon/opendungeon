package models

import (
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/repository"
)

type Level struct {
	ID        uuid.UUID  `json:"id"`
	Name      string     `json:"name"`
	CreatedAt int64      `json:"createdAt"`
	UpdatedAt int64      `json:"updatedAt"`
	Data      *LevelData `json:"data,omitempty"`
}

func RepoToLevel(l repository.Level) Level {
	return Level{
		ID:        l.Uuid,
		Name:      l.Name,
		CreatedAt: l.CreatedAt,
		UpdatedAt: l.UpdatedAt,
	}
}

func RepoToLevelMetaDatas(l []repository.ListLevelsRow) []Level {
	levels := make([]Level, 0, len(l))
	for _, row := range l {
		levels = append(levels, RepoToLevel(row.Level))
	}
	return levels
}
