package models

import (
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/repository"
)

type CellTexture struct {
	Key         string    `json:"key"`
	DisplayName string    `json:"displayName"`
	MediaID     uuid.UUID `json:"mediaId"`
	CreatedAt   int64     `json:"createdAt"`
	UpdatedAt   int64     `json:"updatedAt"`
}

func RepoToCellTexture(ct repository.CellTexture, m ...repository.Medium) CellTexture {
	cellTexture := CellTexture{
		Key:         ct.Key,
		DisplayName: ct.DisplayName,
		CreatedAt:   ct.CreatedAt,
		UpdatedAt:   ct.UpdatedAt,
	}

	if len(m) == 1 {
		cellTexture.MediaID = m[0].Uuid
	}

	return cellTexture
}

func RepoToCellTextures(ct []repository.ListCellTexturesRow) []CellTexture {
	cellTextures := make([]CellTexture, 0, len(ct))
	for _, row := range ct {
		cellTextures = append(cellTextures, RepoToCellTexture(row.CellTexture, row.Medium))
	}
	return cellTextures
}
