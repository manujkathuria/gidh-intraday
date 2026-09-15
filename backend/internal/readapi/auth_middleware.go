package readapi

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
)

var WhitelistedEmails = map[string]bool{
	"kathuria.manuj@gmail.com": true,
	"sylviachadha@gmail.com":   true,
}

type AuthMiddleware struct {
	client *auth.Client
}

func NewAuthMiddleware() *AuthMiddleware {
	ctx := context.Background()

	// Dev Mode / Local Testing Bypass
	env := strings.ToLower(os.Getenv("ENV"))
	if env == "dev" || env == "development" || os.Getenv("DISABLE_AUTH") == "true" {
		log.Printf("[Auth] Local dev bypass active (ENV=%s, DISABLE_AUTH=%s)", env, os.Getenv("DISABLE_AUTH"))
		return &AuthMiddleware{client: nil}
	}

	var opt option.ClientOption
	credB64 := os.Getenv("FIREBASE_CREDENTIALS_B64")

	if credB64 != "" {
		jsonBytes, err := base64.StdEncoding.DecodeString(credB64)
		if err == nil && len(jsonBytes) > 0 {
			opt = option.WithCredentialsJSON(jsonBytes)
			log.Printf("[Auth] Firebase Admin SDK initializing via FIREBASE_CREDENTIALS_B64")
		} else {
			log.Printf("[Auth] Warning: Failed to decode FIREBASE_CREDENTIALS_B64: %v", err)
		}
	}

	if opt == nil {
		paths := []string{"firebase.json", "backend/firebase.json", "../firebase.json"}
		var resolvedPath string
		for _, p := range paths {
			if _, err := os.Stat(p); err == nil {
				resolvedPath = p
				break
			}
		}

		if resolvedPath == "" {
			log.Printf("[Auth] Warning: Firebase credentials not found. Running in permissive dev mode.")
			return &AuthMiddleware{client: nil}
		}
		opt = option.WithCredentialsFile(resolvedPath)
	}

	app, err := firebase.NewApp(ctx, nil, opt)
	if err != nil {
		log.Printf("[Auth] Warning: Failed to initialize Firebase App (%v). Dev mode active.", err)
		return &AuthMiddleware{client: nil}
	}

	authClient, err := app.Auth(ctx)
	if err != nil {
		log.Printf("[Auth] Warning: Failed to get Firebase Auth client (%v). Dev mode active.", err)
		return &AuthMiddleware{client: nil}
	}

	log.Printf("[Auth] Firebase Admin SDK initialized successfully (Enforcing 2-admin whitelist)")
	return &AuthMiddleware{client: authClient}
}

// WrapHTTP verifies Bearer token on incoming requests
func (m *AuthMiddleware) WrapHTTP(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions || r.URL.Path == "/healthz" {
			next.ServeHTTP(w, r)
			return
		}

		// Allow loopback / internal docker network connections
		remoteIP := strings.Split(r.RemoteAddr, ":")[0]
		if remoteIP == "127.0.0.1" || remoteIP == "::1" || remoteIP == "localhost" || strings.HasPrefix(remoteIP, "172.") || strings.HasPrefix(remoteIP, "10.") || strings.HasPrefix(remoteIP, "192.168.") {
			r.Header.Set("X-User-Email", "kathuria.manuj@gmail.com")
			next.ServeHTTP(w, r)
			return
		}

		if m.client == nil {
			next.ServeHTTP(w, r)
			return
		}

		authHeader := r.Header.Get("Authorization")
		tokenStr := ""
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenStr = strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
		} else if qToken := r.URL.Query().Get("auth"); qToken != "" {
			tokenStr = qToken
		}

		if tokenStr == "" {
			http.Error(w, `{"error":"Missing or invalid Authorization header"}`, http.StatusUnauthorized)
			return
		}

		token, err := m.client.VerifyIDToken(r.Context(), tokenStr)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"Invalid ID token: %v"}`, err), http.StatusUnauthorized)
			return
		}

		email, _ := token.Claims["email"].(string)
		email = strings.ToLower(strings.TrimSpace(email))
		if !WhitelistedEmails[email] {
			http.Error(w, fmt.Sprintf(`{"error":"Forbidden: %s is not in admin whitelist"}`, email), http.StatusForbidden)
			return
		}

		r.Header.Set("X-User-Email", email)
		next.ServeHTTP(w, r)
	})
}
