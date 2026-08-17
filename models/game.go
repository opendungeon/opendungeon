package models

import (
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/repository"
)

type Game struct {
	ID           uuid.UUID `json:"id"`
	GameMasterID uuid.UUID `json:"gameMasterId"`
	Name         string    `json:"name"`
	IsActive     bool      `json:"isActive"`
	CreatedAt    int64     `json:"createdAt"`
	UpdatedAt    int64     `json:"updatedAt"`
}

func RepoToGame(g repository.Game, gameMasterID ...uuid.UUID) Game {
	game := Game{
		ID:        g.Uuid,
		Name:      g.Name,
		IsActive:  g.IsActive,
		CreatedAt: g.CreatedAt,
		UpdatedAt: g.UpdatedAt,
	}

	if len(gameMasterID) == 1 {
		game.GameMasterID = gameMasterID[0]
	}

	return game
}

func RepoToGames(g []repository.Game) []Game {
	games := make([]Game, 0, len(g))
	for _, row := range g {
		games = append(games, RepoToGame(row))
	}
	return games
}
