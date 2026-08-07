package models

import "github.com/opendungeon/opendungeon/internal/repository"

type CellTexture struct {
	Key         string `json:"key"`
	DisplayName string `json:"displayName"`
	CreatedAt   int64  `json:"createdAt"`
	UpdatedAt   int64  `json:"updatedAt"`
}

func RepoToCellTexture(ct repository.CellTexture) CellTexture {
	return CellTexture{
		Key:         ct.Key,
		DisplayName: ct.DisplayName,
		CreatedAt:   ct.CreatedAt,
		UpdatedAt:   ct.UpdatedAt,
	}
}

func RepoToCellTextures(ct []repository.CellTexture) []CellTexture {
	cellTextures := make([]CellTexture, 0, len(ct))
	for _, cellTexture := range ct {
		cellTextures = append(cellTextures, RepoToCellTexture(cellTexture))
	}
	return cellTextures
}
