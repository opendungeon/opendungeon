package models

import (
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/repository"
)

type Player struct {
	UserID          uuid.UUID `json:"userId"`
	PermissionLevel string    `json:"permissionLevel"`
}

func RepoToPlayer(g repository.Player, userID ...uuid.UUID) Player {
	player := Player{
		PermissionLevel: g.PermissionLevel,
	}

	if len(userID) == 1 {
		player.UserID = userID[0]
	}

	return player
}
