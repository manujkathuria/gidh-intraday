//go:build ignore
package main

import (
	"fmt"
	"os"

	"github.com/99designs/gqlgen/api"
	"github.com/99designs/gqlgen/codegen/config"
)

func main() {
	cfg, err := config.LoadConfigFromDefaultLocations()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to load config: %v\n", err)
		os.Exit(1)
	}

	err = api.Generate(cfg)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to generate: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("Code generation successful!")
}
