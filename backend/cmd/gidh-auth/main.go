package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"

	"gidh-intraday/backend/internal/kite"

	"github.com/zerodha/gokiteconnect/v4"
)

func main() {
	loadEnvVars()
	apiKey, apiSecret := loadEnvCreds()

	reader := bufio.NewReader(os.Stdin)
	if apiKey == "" {
		fmt.Print("Enter KITE_API_KEY: ")
		apiKey, _ = reader.ReadString('\n')
		apiKey = strings.TrimSpace(apiKey)
	}
	if apiSecret == "" {
		fmt.Print("Enter KITE_API_SECRET: ")
		apiSecret, _ = reader.ReadString('\n')
		apiSecret = strings.TrimSpace(apiSecret)
	}

	// Check if automated TOTP login credentials exist
	userID := os.Getenv("KITE_USER_ID")
	password := os.Getenv("KITE_PASSWORD")
	totpSecret := os.Getenv("KITE_TOTP_SECRET")

	if userID != "" && password != "" && totpSecret != "" {
		fmt.Println("=======================================================")
		fmt.Println("Found KITE_USER_ID & KITE_TOTP_SECRET. Attempting automated login...")
		fmt.Println("=======================================================")
		authSvc := kite.NewZerodhaAuthService(apiKey, apiSecret, userID, password, totpSecret)
		token, err := authSvc.GenerateAccessToken()
		if err == nil {
			fmt.Println("=======================================================")
			fmt.Println("AUTOMATED LOGIN SUCCESS! Access token saved to the local environment file.")
			fmt.Println("=======================================================")
			updateEnvFile(apiKey, apiSecret, token)
			return
		}
		fmt.Printf("Automated login attempt failed (%v). Falling back to manual URL flow...\n\n", err)
	}

	var reqToken string
	if len(os.Args) > 1 && strings.TrimSpace(os.Args[1]) != "" {
		reqToken = strings.TrimSpace(os.Args[1])
	} else {
		loginURL := fmt.Sprintf("https://kite.zerodha.com/connect/login?v=3&api_key=%s", apiKey)
		fmt.Println("=======================================================")
		fmt.Println("Step 1: Open this URL in your browser to log in:")
		fmt.Println(loginURL)
		fmt.Println("=======================================================")
		fmt.Print("Step 2: Paste the 'request_token' from the redirected URL: ")
		reqToken, _ = reader.ReadString('\n')
		reqToken = strings.TrimSpace(reqToken)
	}

	if reqToken == "" {
		fmt.Println("Error: request_token cannot be empty")
		return
	}

	kc := kiteconnect.New(apiKey)
	data, err := kc.GenerateSession(reqToken, apiSecret)
	if err != nil {
		fmt.Printf("Error generating session: %v\n", err)
		return
	}

	fmt.Println("=======================================================")
	fmt.Printf("SUCCESS! Authenticated as: %s (%s). Access token saved to the local environment file.\n", data.UserName, data.UserShortName)
	fmt.Println("=======================================================")

	updateEnvFile(apiKey, apiSecret, data.AccessToken)
}

func loadEnvVars() {
	paths := []string{".env", "../.env", "../../.env"}
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
				os.Setenv(k, v)
			}
		}
		return
	}
}

func loadEnvCreds() (string, string) {
	return os.Getenv("KITE_API_KEY"), os.Getenv("KITE_API_SECRET")
}

func updateEnvFile(apiKey, apiSecret, token string) {
	paths := []string{".env", "../.env"}
	for _, envPath := range paths {
		content, err := os.ReadFile(envPath)
		if err != nil {
			continue
		}
		lines := strings.Split(string(content), "\n")
		for i, line := range lines {
			if strings.HasPrefix(line, "KITE_ACCESS_TOKEN=") {
				lines[i] = "KITE_ACCESS_TOKEN=" + token
			}
		}
		_ = os.WriteFile(envPath, []byte(strings.Join(lines, "\n")), 0600)
		fmt.Printf("Successfully updated %s with new KITE_ACCESS_TOKEN.\n", envPath)
		return
	}
}
