package config

import (
	"fmt"
	"net/url"
)

type DataConfig struct {
	DBURL           string
	KiteAPIKey      string
	KiteAccessToken string
}

func LoadData() (*DataConfig, error) {
	dbURL, err := LoadDatabaseURL()
	if err != nil {
		return nil, err
	}

	apiKey := cleanEnv("KITE_API_KEY")
	accessToken := cleanEnv("KITE_ACCESS_TOKEN")
	if apiKey == "" || accessToken == "" {
		return nil, fmt.Errorf("KITE_API_KEY and KITE_ACCESS_TOKEN are required for data commands")
	}

	return &DataConfig{DBURL: dbURL, KiteAPIKey: apiKey, KiteAccessToken: accessToken}, nil
}

// LoadDatabaseURL loads only the database settings. Pure database jobs, such as
// feature construction, must not require a broker credential.
func LoadDatabaseURL() (string, error) {
	loadEnvFile()

	dbHost, err := requireEnv("DB_HOST")
	if err != nil {
		return "", err
	}
	dbPort, err := requireEnv("DB_PORT")
	if err != nil {
		return "", err
	}
	dbUser, err := requireEnv("DB_USER")
	if err != nil {
		return "", err
	}
	dbPass, err := requireEnv("DB_PASSWORD")
	if err != nil {
		return "", err
	}
	dbName, err := requireEnv("DB_NAME")
	if err != nil {
		return "", err
	}
	dbSSL, err := requireEnv("DB_SSLMODE")
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s", dbUser, url.QueryEscape(dbPass), dbHost, dbPort, dbName, dbSSL), nil
}
