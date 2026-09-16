package broker

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/url"
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

	totpCode, err := totp.GenerateCode(z.totpSecret, time.Now())
	if err != nil {
		return "", fmt.Errorf("failed generating TOTP code: %w", err)
	}

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

	reqToken, err := z.fetchRequestToken()
	if err != nil {
		return "", err
	}

	kc := kiteconnect.New(z.apiKey)
	sessionData, err := kc.GenerateSession(reqToken, z.apiSecret)
	if err != nil {
		return "", fmt.Errorf("failed generating kite session: %w", err)
	}

	return sessionData.AccessToken, nil
}
