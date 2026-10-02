package models

import (
	"uuid"

	"github.com/opendungeon/opendungeon/internal/repository"
)

type Decoration struct {
	Key         string    `json:"key"`
	DisplayName string    `json:"displayName"`
	MediaID     uuid.UUID `json:"mediaId"`
	CreatedAt   int64     `json:"createdAt"`
	UpdatedAt   int64     `json:"updatedAt"`
}

func RepoToDecoration(ct repository.Decoration, m ...repository.Medium) Decoration {
	decoration := Decoration{
		Key:         ct.Key,
		DisplayName: ct.DisplayName,
		CreatedAt:   ct.CreatedAt,
		UpdatedAt:   ct.UpdatedAt,
	}

	if len(m) == 1 {
		decoration.MediaID = m[0].Uuid
	}

	return decoration
}

func RepoToDecorations(ct []repository.ListDecorationsRow) []Decoration {
	decorations := make([]Decoration, 0, len(ct))
	for _, row := range ct {
		decorations = append(decorations, RepoToDecoration(row.Decoration, row.Medium))
	}
	return decorations
}
