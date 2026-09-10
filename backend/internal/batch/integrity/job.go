// Package integrity owns backend EOD repair orchestration.
package integrity

import (
	"context"

	"gidh-intraday/backend/internal/features/daily"
	"gidh-intraday/backend/internal/store"
)

type Repair func(context.Context, string) error

type Job struct {
	Features *store.DailyFeatureRepo
	Repair   Repair
	Version  string
}

type Report struct {
	SessionDate         string
	Skipped             bool
	IntradayFeatureRows int64
}

// Run trusts backend readiness. A READY session is a no-op; every other state
// is repaired before its daily and intraday derived data is rebuilt.
func (j Job) Run(ctx context.Context, sessionDate string) (Report, error) {
	report := Report{SessionDate: sessionDate}
	published, err := j.Features.Published(ctx, sessionDate)
	if err != nil {
		return report, err
	}
	if published {
		report.Skipped = true
		return report, nil
	}
	if err := j.Repair(ctx, sessionDate); err != nil {
		return report, err
	}
	if err := daily.Publish(ctx, j.Features, sessionDate, j.Version); err != nil {
		return report, err
	}
	rows, err := j.Features.BuildIntraday(ctx, sessionDate, sessionDate)
	if err != nil {
		return report, err
	}
	report.IntradayFeatureRows = rows
	return report, nil
}
