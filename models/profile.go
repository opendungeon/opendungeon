package models

import (
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/repository"
)

type Profile struct {
	Username  string     `json:"username"`
	CreatedAt int64      `json:"createdAt"`
	UpdatedAt int64      `json:"updatedAt"`
	AvatarID  *uuid.UUID `json:"avatarId"`
}

func RepoToProfile(p repository.Profile, avatarID ...uuid.UUID) Profile {
	profile := Profile{
		Username:  p.Username,
		CreatedAt: p.CreatedAt,
		UpdatedAt: p.UpdatedAt,
	}

	if len(avatarID) == 1 {
		profile.AvatarID = &avatarID[0]
	}

	return profile
}
