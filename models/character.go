package models

import (
	"uuid"

	"github.com/opendungeon/opendungeon/internal/repository"
)

type Character struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	MediaID   uuid.UUID `json:"mediaId"`
	CreatedAt int64     `json:"createdAt"`
	UpdatedAt int64     `json:"updatedAt"`
}

func RepoToCharacter(c repository.Character, m ...repository.Medium) Character {
	character := Character{
		ID:        c.Uuid,
		Name:      c.Name,
		CreatedAt: c.CreatedAt,
		UpdatedAt: c.UpdatedAt,
	}

	if len(m) == 1 {
		character.MediaID = m[0].Uuid
	}

	return character
}

func RepoToCharacters(c []repository.ListCharactersRow) []Character {
	characters := make([]Character, 0, len(c))
	for _, row := range c {
		characters = append(characters, RepoToCharacter(row.Character, row.Medium))
	}

	return characters
}
