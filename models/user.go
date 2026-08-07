package models

import (
	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/repository"
)

type User struct {
	ID      uuid.UUID `json:"id"`
	Email   string    `json:"email"`
	IsAdmin bool      `json:"isAdmin"`
}

func RepoToUser(u repository.User) User {
	return User{
		ID:      u.Uuid,
		Email:   u.Email,
		IsAdmin: u.IsAdmin,
	}
}
