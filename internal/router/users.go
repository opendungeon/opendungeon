package router

import (
	"net/http"

	"github.com/gofiber/fiber/v3/log"
	"github.com/opendungeon/opendungeon/database"
	"github.com/opendungeon/opendungeon/internal/handlers"
)

// getMyUser
//
//	@Summary		Get user
//	@Description	Get the details of the authenticated user.
//	@Tags			Users
//	@Produce		json
//	@Success		200	{object}	database.GetUserRow
//	@Failure		401	{string}	string	"Unauthorized"
//	@Failure		404	{string}	string	"Not found"
//	@Failure		500	{string}	string	"Server error"
//	@Router			/api/users/me [get]
func (app *router) getMyUser(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserID(r.Context())
	if !ok {
		http.Error(w, "Unauthorized.", http.StatusUnauthorized)
		return
	}

	conn, err := database.Connect(r.Context())
	if err != nil {
		log.Errorf("failed to connect to database: %v", err)
		http.Error(w, "Failed to connect to database.", http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	user, err := handlers.GetUser(r.Context(), conn, userID)
	if err != nil {
		// TODO: handle
	}

	_ = writeJSON(w, user)
}
