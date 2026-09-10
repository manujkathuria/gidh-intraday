package kite

import (
	"testing"
	"time"
)

func TestClientRateLimiter(t *testing.T) {
	client := NewClient("dummy_key", "dummy_token")
	client.rateLimit = 50 * time.Millisecond // 50ms for fast test

	start := time.Now()
	// Call waitRateLimit 3 times
	client.waitRateLimit()
	client.waitRateLimit()
	client.waitRateLimit()
	elapsed := time.Since(start)

	// 3 calls with 50ms interval must take at least 100ms
	if elapsed < 90*time.Millisecond {
		t.Errorf("rate limiter too fast: expected >= 90ms, got %v", elapsed)
	}
}
