package providers

import (
	"context"
	"errors"

	"golang.org/x/oauth2"
)

var (
	ErrUnexpectedStatusCode = errors.New("unexpected status code")
)

type UserInfo struct {
	ID        string
	Email     string
	Username  string
	AvatarUri *string
}

type Provider interface {
	AuthUrl(state string) string
	Exchange(ctx context.Context, code string) (*oauth2.Token, error)
	GetUserInfo(ctx context.Context, token *oauth2.Token) (UserInfo, error)
}
