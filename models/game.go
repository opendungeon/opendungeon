package models

import (
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/repository"
)

type Game struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	IsActive  bool      `json:"isActive"`
	CreatedAt int64     `json:"createdAt"`
	UpdatedAt int64     `json:"updatedAt"`
}

func RepoToGame(g repository.Game) Game {
	return Game{
		ID:        g.Uuid,
		Name:      g.Name,
		IsActive:  g.IsActive,
		CreatedAt: g.CreatedAt,
		UpdatedAt: g.UpdatedAt,
	}
}

func RepoToGames(g []repository.ListGamesRow) []Game {
	games := make([]Game, 0, len(g))
	for _, row := range g {
		games = append(games, RepoToGame(row.Game))
	}
	return games
}
