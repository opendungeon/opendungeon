package middlewares

import "net/http"

func Chain(next http.Handler, middlewares ...func(http.Handler) http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		last := len(middlewares) - 1
		for i := last; i >= 0; i-- {
			next = middlewares[i](next)
		}
		next.ServeHTTP(w, r)
	})
}
