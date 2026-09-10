// Package daily publishes immutable daily feature baselines.
package daily

import (
	"context"
	"fmt"

	"gidh-intraday/backend/internal/store"
)

// Publish creates or reuses the immutable baseline for one trading session.
func Publish(ctx context.Context, repo *store.DailyFeatureRepo, sessionDate, version string) error {
	run, err := repo.Start(ctx, sessionDate, version)
	if err != nil {
		return err
	}
	if run.AlreadyPublished {
		return repo.SaveReadiness(ctx, run)
	}

	buildErr := repo.Build(ctx, &run)
	completeErr := repo.Complete(ctx, &run, buildErr)
	readinessErr := repo.SaveReadiness(ctx, run)
	if buildErr != nil {
		return buildErr
	}
	if completeErr != nil {
		return completeErr
	}
	if readinessErr != nil {
		return readinessErr
	}
	if run.ProducedInstruments != run.ExpectedInstruments {
		return fmt.Errorf("feature baseline for %s is incomplete: expected %d instruments, produced %d", sessionDate, run.ExpectedInstruments, run.ProducedInstruments)
	}
	return nil
}
