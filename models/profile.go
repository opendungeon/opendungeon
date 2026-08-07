package models

import "github.com/opendungeon/opendungeon/internal/repository"

type Profile struct {
	Username  string `json:"username"`
	CreatedAt int64  `json:"createdAt"`
	UpdatedAt int64  `json:"updatedAt"`
}

func RepoToProfile(p repository.Profile) Profile {
	return Profile{
		Username:  p.Username,
		CreatedAt: p.CreatedAt,
		UpdatedAt: p.UpdatedAt,
	}
}
