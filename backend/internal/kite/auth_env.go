package kite

import (
	"fmt"
	"os"
	"strings"
)

func UpdateEnvToken(token string) {
	paths := []string{".env", "../.env", "../../.env", "/app/.env"}
	for _, envPath := range paths {
		content, err := os.ReadFile(envPath)
		if err != nil {
			continue
		}
		lines := strings.Split(string(content), "\n")
		updated := false
		for i, line := range lines {
			if strings.HasPrefix(line, "KITE_ACCESS_TOKEN=") {
				lines[i] = fmt.Sprintf("KITE_ACCESS_TOKEN='%s'", token)
				updated = true
			}
		}
		if updated {
			_ = os.WriteFile(envPath, []byte(strings.Join(lines, "\n")), 0600)
			fmt.Printf("Updated %s with new KITE_ACCESS_TOKEN\n", envPath)
			return
		}
	}
}
