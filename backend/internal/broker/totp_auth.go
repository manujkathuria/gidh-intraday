package broker

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"strings"
	"time"

	"github.com/pquerna/otp/totp"
	"github.com/zerodha/gokiteconnect/v4"
)

type ZerodhaAuthService struct {
	apiKey     string
	apiSecret  string
	userID     string
	password   string
	totpSecret string
	client     *http.Client
}

func NewZerodhaAuthService(apiKey, apiSecret, userID, password, totpSecret string) *ZerodhaAuthService {
	jar, _ := cookiejar.New(nil)
	client := &http.Client{
		Jar:     jar,
		Timeout: 15 * time.Second,
	}
	return &ZerodhaAuthService{
		apiKey:     apiKey,
		apiSecret:  apiSecret,
		userID:     userID,
		password:   password,
		totpSecret: totpSecret,
		client:     client,
	}
}

// GenerateAccessToken performs automated 2-step TOTP login against Zerodha Kite
func (z *ZerodhaAuthService) GenerateAccessToken() (string, error) {
	if z.apiKey == "" || z.apiSecret == "" || z.userID == "" || z.password == "" || z.totpSecret == "" {
		return "", fmt.Errorf("missing credentials for automated TOTP login")
	}

	// 1. Submit UserID & Password
	loginURL := "https://kite.zerodha.com/api/login"
	loginData := url.Values{
		"user_id":  {z.userID},
		"password": {z.password},
	}

	resp, err := z.client.PostForm(loginURL, loginData)
	if err != nil {
		return "", fmt.Errorf("kite login step 1 failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var step1Res struct {
		Status string `json:"status"`
		Data   struct {
			RequestID string `json:"request_id"`
		} `json:"data"`
		Message string `json:"message"`
	}
	if err := json.Unmarshal(body, &step1Res); err != nil || step1Res.Status != "success" {
		return "", fmt.Errorf("kite login step 1 error (%s): %s", step1Res.Status, step1Res.Message)
	}

	// 2. Generate current 6-digit TOTP code
	totpCode, err := totp.GenerateCode(z.totpSecret, time.Now())
	if err != nil {
		return "", fmt.Errorf("failed generating TOTP code: %w", err)
	}

	// 3. Submit 2FA TOTP
	twoFaURL := "https://kite.zerodha.com/api/twofa"
	twoFaData := url.Values{
		"user_id":      {z.userID},
		"request_id":   {step1Res.Data.RequestID},
		"twofa_value":  {totpCode},
		"twofa_type":   {"totp"},
		"skip_session": {""},
	}

	twoFaResp, err := z.client.PostForm(twoFaURL, twoFaData)
	if err != nil {
		return "", fmt.Errorf("kite 2FA step failed: %w", err)
	}
	defer twoFaResp.Body.Close()

	twoFaBody, _ := io.ReadAll(twoFaResp.Body)
	var step2Res struct {
		Status  string `json:"status"`
		Message string `json:"message"`
	}
	if err := json.Unmarshal(twoFaBody, &step2Res); err != nil || step2Res.Status != "success" {
		return "", fmt.Errorf("kite 2FA error (%s): %s", step2Res.Status, step2Res.Message)
	}

	// 4. Request Kite Connect OAuth redirect to get request_token
	connectURL := fmt.Sprintf("https://kite.zerodha.com/connect/login?v=3&api_key=%s", z.apiKey)
	req, _ := http.NewRequest("GET", connectURL, nil)

	noRedirectClient := &http.Client{
		Jar: z.client.Jar,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
		Timeout: 10 * time.Second,
	}

	oauthResp, err := noRedirectClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("kite connect redirect failed: %w", err)
	}
	defer oauthResp.Body.Close()

	redirectLoc := oauthResp.Header.Get("Location")
	if redirectLoc == "" {
		return "", fmt.Errorf("no redirect location returned from kite connect")
	}

	if strings.Contains(redirectLoc, "/connect/finish") {
		req2, _ := http.NewRequest("GET", redirectLoc, nil)
		oauthResp2, err := noRedirectClient.Do(req2)
		if err == nil {
			defer oauthResp2.Body.Close()
			if loc2 := oauthResp2.Header.Get("Location"); loc2 != "" {
				redirectLoc = loc2
			}
		}
	}

	parsedLoc, err := url.Parse(redirectLoc)
	if err != nil {
		return "", fmt.Errorf("failed parsing redirect url: %w", err)
	}

	reqToken := parsedLoc.Query().Get("request_token")
	if reqToken == "" {
		return "", fmt.Errorf("request_token not found in redirect url: %s", redirectLoc)
	}

	// 5. Exchange request_token for official access_token
	kc := kiteconnect.New(z.apiKey)
	sessionData, err := kc.GenerateSession(reqToken, z.apiSecret)
	if err != nil {
		return "", fmt.Errorf("failed generating kite session: %w", err)
	}

	return sessionData.AccessToken, nil
}
