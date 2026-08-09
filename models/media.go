package models

import (
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/repository"
)

type Media struct {
	ID          uuid.UUID `json:"id"`
	ContentType string    `json:"contentType"`
	Size        int64     `json:"size"`
	CreatedAt   int64     `json:"createdAt"`
}

func RepoToMedia(m repository.Medium) Media {
	return Media{
		ID:          m.Uuid,
		ContentType: m.ContentType,
		Size:        m.Size,
		CreatedAt:   m.CreatedAt,
	}
}
