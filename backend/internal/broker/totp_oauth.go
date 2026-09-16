package broker

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

func (z *ZerodhaAuthService) fetchRequestToken() (string, error) {
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
	return reqToken, nil
}
