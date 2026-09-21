package auth

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	firebase "firebase.google.com/go/v4"
	firebaseauth "firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
)

type contextKey string

const userEmailKey contextKey = "verified-user-email"

type Middleware struct {
	client  *firebaseauth.Client
	enabled bool
	allowed map[string]struct{}
}

func New(ctx context.Context) (*Middleware, error) {
	if !strings.EqualFold(os.Getenv("ENV"), "production") || strings.EqualFold(os.Getenv("DISABLE_AUTH"), "true") {
		log.Println("[AUTH] development bypass active")
		return &Middleware{}, nil
	}
	encoded := strings.TrimSpace(os.Getenv("FIREBASE_CREDENTIALS_B64"))
	if encoded == "" {
		return nil, fmt.Errorf("production requires FIREBASE_CREDENTIALS_B64")
	}
	credentials, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return nil, fmt.Errorf("decode Firebase credentials: %w", err)
	}
	app, err := firebase.NewApp(ctx, nil, option.WithCredentialsJSON(credentials))
	if err != nil {
		return nil, fmt.Errorf("initialize Firebase: %w", err)
	}
	client, err := app.Auth(ctx)
	if err != nil {
		return nil, fmt.Errorf("initialize Firebase auth: %w", err)
	}
	allowed := make(map[string]struct{})
	for _, email := range strings.Split(os.Getenv("ORDER_AUTHORIZED_EMAILS"), ",") {
		email = strings.ToLower(strings.TrimSpace(email))
		if email != "" {
			allowed[email] = struct{}{}
		}
	}
	if len(allowed) == 0 {
		return nil, fmt.Errorf("production requires ORDER_AUTHORIZED_EMAILS")
	}
	return &Middleware{client: client, enabled: true, allowed: allowed}, nil
}

func (m *Middleware) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions || r.URL.Path == "/healthz" || !m.enabled {
			next.ServeHTTP(w, r)
			return
		}

		// Public telemetry streams and GraphQL query access (order mutations will verify auth in resolver)
		isPublicStream := strings.HasPrefix(r.URL.Path, "/v1/stream/radar") ||
			strings.HasPrefix(r.URL.Path, "/v1/stream/sectors") ||
			strings.HasPrefix(r.URL.Path, "/v1/stream/chart") ||
			strings.HasPrefix(r.URL.Path, "/v1/live/market/ws") ||
			strings.HasPrefix(r.URL.Path, "/v1/replay/ws")

		token := strings.TrimSpace(strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer "))
		if token == "" {
			token = strings.TrimSpace(r.URL.Query().Get("auth"))
		}

		if token == "" {
			if isPublicStream {
				next.ServeHTTP(w, r)
				return
			}
			http.Error(w, `{"error":"authentication required"}`, http.StatusUnauthorized)
			return
		}

		verified, err := m.client.VerifyIDToken(r.Context(), token)
		if err != nil {
			if isPublicStream {
				next.ServeHTTP(w, r)
				return
			}
			http.Error(w, `{"error":"invalid authentication token"}`, http.StatusUnauthorized)
			return
		}
		email, _ := verified.Claims["email"].(string)
		email = strings.ToLower(strings.TrimSpace(email))
		if _, ok := m.allowed[email]; !ok && !isPublicStream {
			http.Error(w, `{"error":"not authorised for live operations"}`, http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), userEmailKey, email)))
	})
}

func UserEmail(ctx context.Context) string {
	email, _ := ctx.Value(userEmailKey).(string)
	if email == "" {
		return "DEVELOPMENT"
	}
	return email
}
