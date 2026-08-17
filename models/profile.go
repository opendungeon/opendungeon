package models

import (
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/repository"
)

type Profile struct {
	ID        uuid.UUID  `json:"id"`
	Username  string     `json:"username"`
	CreatedAt int64      `json:"createdAt"`
	UpdatedAt int64      `json:"updatedAt"`
	AvatarID  *uuid.UUID `json:"avatarId"`
}

func RepoToProfile(p repository.Profile, userID uuid.UUID, avatarID *uuid.UUID) Profile {
	return Profile{
		ID:        userID,
		Username:  p.Username,
		CreatedAt: p.CreatedAt,
		UpdatedAt: p.UpdatedAt,
		AvatarID:  avatarID,
	}
}
