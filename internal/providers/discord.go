package providers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/endpoints"
)

const (
	discordApiUrl = "https://discord.com/api"
	discordCdnUrl = "https://cdn.discordapp.com"
)

var discordScopes = []string{"email", "identify"}

type Discord struct {
	*oauth2.Config
}

func NewDiscord(baseRedirectUrl *url.URL, clientID, clientSecret string) Discord {
	redirectUrl := baseRedirectUrl.JoinPath("api", "auth", "providers", "discord", "callback")
	conf := oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		Endpoint:     endpoints.Discord,
		RedirectURL:  redirectUrl.String(),
		Scopes:       discordScopes,
	}

	return Discord{&conf}
}

func (d Discord) AuthUrl(state string) string {
	return d.AuthCodeURL(state)
}

func (d Discord) Exchange(ctx context.Context, code string) (*oauth2.Token, error) {
	return d.Config.Exchange(ctx, code)
}

func (d Discord) GetUserInfo(ctx context.Context, token *oauth2.Token) (UserInfo, error) {
	var ui UserInfo

	req, err := http.NewRequest(http.MethodGet, discordApiUrl+"/users/@me", http.NoBody)
	if err != nil {
		return ui, err
	}

	bearer := fmt.Sprintf("Bearer %s", token.AccessToken)
	req.Header.Set("Authorization", bearer)

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return ui, err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return ui, ErrUnexpectedStatusCode
	}

	var body struct {
		ID       string  `json:"id"`
		Username string  `json:"username"`
		Avatar   *string `json:"avatar"`
		Email    string  `json:"email"`
	}
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		return ui, fmt.Errorf("received unexpected response from discord: %v", err)
	}

	ui.ID = body.ID
	ui.Email = body.Email
	ui.Username = body.Username

	if body.Avatar != nil {
		avatarUri := fmt.Sprintf("%s/avatars/%s/%s.png?size=128", discordCdnUrl, body.ID, *body.Avatar)
		ui.AvatarUri = &avatarUri
	}

	return ui, nil
}
