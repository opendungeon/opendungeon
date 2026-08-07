package models

import (
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/repository"
)

type Player struct {
	ID              uuid.UUID `json:"id"`
	PermissionLevel string    `json:"permissionLevel"`
}

func RepoToPlayer(g repository.Player) Player {
	return Player{
		ID:              g.Uuid,
		PermissionLevel: g.PermissionLevel,
	}
}
