package middlewares

import (
	"context"
	"errors"
	"log/slog"
	"net/http"

	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/database"
	"github.com/opendungeon/opendungeon/internal/repository"
	"github.com/opendungeon/opendungeon/internal/sessions"
)

func Admin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sessionCookie, err := r.Cookie("session_id")
		if err != nil {
			http.Error(w, "Unauthorized.", http.StatusUnauthorized)
			return
		}

		sessionID, err := uuid.Parse(sessionCookie.Value)
		if err != nil {
			slog.Warn("invalid uuid")
			http.Error(w, "Unauthorized.", http.StatusUnauthorized)
			return
		}

		conn, err := database.Connect(r.Context())
		if err != nil {
			slog.Error("failed to connect to database", "error", err.Error())
			http.Error(w, "Internal server error.", http.StatusInternalServerError)
			return
		}
		defer conn.Close()

		session, err := sessions.Get(r.Context(), conn, sessionID)
		if err != nil {
			if errors.Is(err, sessions.ErrSessionNotFound) {
				slog.Warn("session not found")
				http.Error(w, "Unauthorized.", http.StatusUnauthorized)
				return
			}

			slog.Error("failed to get session", "error", err.Error())
			http.Error(w, "Internal server error.", http.StatusInternalServerError)
			return
		}

		repo := repository.New(conn)
		user, err := repo.GetUser(r.Context(), session.UserID)
		if err != nil {
			http.Error(w, "Unauthorized.", http.StatusUnauthorized)
			return
		}

		if !user.IsAdmin {
			http.Error(w, "Forbidden.", http.StatusForbidden)
			return
		}

		ctx := context.WithValue(r.Context(), sessions.SessionKey, session.ID)
		ctx = context.WithValue(ctx, sessions.UserKey, session.UserID)
		authedRequest := r.WithContext(ctx)

		next.ServeHTTP(w, authedRequest)
	})
}
