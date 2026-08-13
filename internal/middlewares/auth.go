package middlewares

import (
	"context"
	"errors"
	"net/http"

	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/database"
	"github.com/opendungeon/opendungeon/internal/sessions"
)

func Auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sessionCookie, err := r.Cookie("session_id")
		if err != nil {
			http.Error(w, "Unauthorized.", http.StatusUnauthorized)
			return
		}

		sessionID, err := uuid.Parse(sessionCookie.Value)
		if err != nil {
			http.Error(w, "Unauthorized.", http.StatusUnauthorized)
			return
		}

		conn, err := database.Connect(r.Context())
		if err != nil {
			// TODO: log
			http.Error(w, "Internal server error.", http.StatusInternalServerError)
			return
		}

		session, err := sessions.GetAndExtend(r.Context(), conn, sessionID)
		_ = conn.Close()
		if err != nil {
			if errors.Is(err, sessions.ErrSessionNotFound) {
				http.Error(w, "Unauthorized.", http.StatusUnauthorized)
				return
			}

			// TODO: log
			http.Error(w, "Internal server error.", http.StatusInternalServerError)
			return
		}

		ctx := context.WithValue(r.Context(), "session_id", session.ID)
		ctx = context.WithValue(ctx, "user_id", session.UserID)
		authedRequest := r.WithContext(ctx)

		next.ServeHTTP(w, authedRequest)
	})
}
