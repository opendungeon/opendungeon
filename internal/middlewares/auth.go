package middlewares

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"uuid"

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
			slog.Error("failed to connect to database", "error", err.Error())
			http.Error(w, "Internal server error.", http.StatusInternalServerError)
			return
		}

		session, err := sessions.Get(r.Context(), conn, sessionID)
		_ = conn.Close()
		if err != nil {
			if errors.Is(err, sessions.ErrSessionNotFound) {
				http.Error(w, "Unauthorized.", http.StatusUnauthorized)
				return
			}

			slog.Error("failed to get session", "error", err.Error())
			http.Error(w, "Internal server error.", http.StatusInternalServerError)
			return
		}

		ctx := context.WithValue(r.Context(), sessions.SessionKey, session.ID)
		ctx = context.WithValue(ctx, sessions.UserKey, session.UserID)
		authedRequest := r.WithContext(ctx)

		next.ServeHTTP(w, authedRequest)
	})
}
