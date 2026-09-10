package config

import (
	"os"
	"testing"
)

func TestRequireEnvMissing(t *testing.T) {
	os.Unsetenv("TEST_NON_EXISTENT_VAR_123")
	_, err := requireEnv("TEST_NON_EXISTENT_VAR_123")
	if err == nil {
		t.Fatalf("expected error for missing environment variable, got nil")
	}
}

func TestRequireEnvPresent(t *testing.T) {
	os.Setenv("TEST_PRESENT_VAR_123", "some_value")
	defer os.Unsetenv("TEST_PRESENT_VAR_123")

	val, err := requireEnv("TEST_PRESENT_VAR_123")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if val != "some_value" {
		t.Errorf("expected 'some_value', got '%s'", val)
	}
}
