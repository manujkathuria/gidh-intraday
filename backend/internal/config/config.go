package config

import (
	"fmt"
	"net/url"
	"os"
	"strings"
)

type Config struct {
	DBURL            string
	RedisAddr        string
	KiteAPIKey       string
	KiteAPISecret    string
	KiteAccessToken  string
	KiteUserID       string
	KitePassword     string
	KiteTOTPSecret   string
	FirebaseCredPath string
	FirebaseCredB64  string
	GeminiAPIKey     string
	Port             string
	Env              string
}

func Load() (*Config, error) {
	loadEnvFile()

	dbHost, err := requireEnv("DB_HOST")
	if err != nil {
		return nil, err
	}
	dbPort, err := requireEnv("DB_PORT")
	if err != nil {
		return nil, err
	}
	dbUser, err := requireEnv("DB_USER")
	if err != nil {
		return nil, err
	}
	dbPass, err := requireEnv("DB_PASSWORD")
	if err != nil {
		return nil, err
	}
	dbName, err := requireEnv("DB_NAME")
	if err != nil {
		return nil, err
	}
	dbSSL, err := requireEnv("DB_SSLMODE")
	if err != nil {
		return nil, err
	}

	redisAddr, err := requireEnv("REDIS_ADDR")
	if err != nil {
		return nil, err
	}
	kiteKey := cleanEnv("KITE_API_KEY")
	kiteSec := cleanEnv("KITE_API_SECRET")
	kiteToken := cleanEnv("KITE_ACCESS_TOKEN")
	kiteUser := cleanEnv("KITE_USER_ID")
	kitePass := cleanEnv("KITE_PASSWORD")
	kiteTotp := cleanEnv("KITE_TOTP_SECRET")
	firebaseCredPath := strings.TrimSpace(os.Getenv("FIREBASE_CREDENTIALS_PATH"))
	if firebaseCredPath == "" {
		firebaseCredPath = "firebase.json"
	}

	port, err := requireEnv("PORT")
	if err != nil {
		return nil, err
	}
	appEnv, err := requireEnv("ENV")
	if err != nil {
		return nil, err
	}

	escapedPass := url.QueryEscape(dbPass)
	dbURL := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s",
		dbUser, escapedPass, dbHost, dbPort, dbName, dbSSL)

	firebaseCredB64 := cleanEnv("FIREBASE_CREDENTIALS_B64")

	return &Config{
		DBURL:            dbURL,
		RedisAddr:        redisAddr,
		KiteAPIKey:       kiteKey,
		KiteAPISecret:    kiteSec,
		KiteAccessToken:  kiteToken,
		KiteUserID:       kiteUser,
		KitePassword:     kitePass,
		KiteTOTPSecret:   kiteTotp,
		FirebaseCredPath: firebaseCredPath,
		FirebaseCredB64:  firebaseCredB64,
		GeminiAPIKey:     os.Getenv("GEMINI_API_KEY"), // Optional until AI pod activated
		Port:             port,
		Env:              appEnv,
	}, nil
}

func cleanEnv(key string) string {
	v := strings.TrimSpace(os.Getenv(key))
	v = strings.Trim(v, `"'`)
	return strings.TrimSpace(v)
}

func requireEnv(key string) (string, error) {
	val := strings.TrimSpace(os.Getenv(key))
	if val == "" {
		return "", fmt.Errorf("FATAL: required environment variable '%s' is missing or empty. Shutting down", key)
	}
	return val, nil
}

func loadEnvFile() {
	paths := []string{".env", "../.env", "../../.env", "../../../.env"}
	for _, p := range paths {
		content, err := os.ReadFile(p)
		if err != nil {
			continue
		}
		for _, line := range strings.Split(string(content), "\n") {
			line = strings.TrimSpace(line)
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			parts := strings.SplitN(line, "=", 2)
			if len(parts) == 2 {
				k := strings.TrimSpace(parts[0])
				v := strings.TrimSpace(parts[1])
				v = strings.Trim(v, `"'`)
				if k == "KITE_ACCESS_TOKEN" || os.Getenv(k) == "" {
					os.Setenv(k, v)
				}
			}
		}
		return
	}
}
