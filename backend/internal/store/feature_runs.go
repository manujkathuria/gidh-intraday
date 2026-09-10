package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
)

type DailyFeatureRun struct {
	ID                  string
	SessionDate         string
	ExpectedInstruments int
	ProducedInstruments int
	AlreadyPublished    bool
}

type DailyFeatureRepo struct{ db *DB }

func NewDailyFeatureRepo(db *DB) *DailyFeatureRepo { return &DailyFeatureRepo{db: db} }

func (r *DailyFeatureRepo) Start(ctx context.Context, sessionDate, version string) (DailyFeatureRun, error) {
	run := DailyFeatureRun{SessionDate: sessionDate}
	err := r.db.Pool.QueryRow(ctx, `
		SELECT id::text, expected_instruments, produced_instruments
		FROM market.feature_runs
		WHERE feature_set = 'DAILY' AND feature_version = $1 AND session_date = $2::date AND status = 'SUCCEEDED';
	`, version, sessionDate).Scan(&run.ID, &run.ExpectedInstruments, &run.ProducedInstruments)
	if err == nil {
		run.AlreadyPublished = true
		return run, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return run, err
	}

	err = r.db.Pool.QueryRow(ctx, `
		WITH active AS (SELECT COUNT(*) AS count FROM market.instruments WHERE is_active)
		INSERT INTO market.feature_runs (feature_set, feature_version, session_date, input_cutoff, expected_instruments, status)
		SELECT 'DAILY', $1, $2::date, NOW(), count, 'RUNNING' FROM active
		RETURNING id::text, expected_instruments;
	`, version, sessionDate).Scan(&run.ID, &run.ExpectedInstruments)
	return run, err
}

func (r *DailyFeatureRepo) Complete(ctx context.Context, run *DailyFeatureRun, err error) error {
	status := "SUCCEEDED"
	message := ""
	if err != nil || run.ProducedInstruments != run.ExpectedInstruments {
		status = "FAILED"
		if err != nil {
			message = err.Error()
		} else {
			message = fmt.Sprintf("expected %d features, produced %d", run.ExpectedInstruments, run.ProducedInstruments)
		}
	}
	_, updateErr := r.db.Pool.Exec(ctx, `
		UPDATE market.feature_runs
		SET produced_instruments = $2, status = $3, finished_at = NOW(), error_message = NULLIF($4, '')
		WHERE id = $1::uuid;
	`, run.ID, run.ProducedInstruments, status, message)
	return updateErr
}

func (r *DailyFeatureRepo) SaveReadiness(ctx context.Context, run DailyFeatureRun) error {
	var active, futures, history, features int
	err := r.db.Pool.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE i.is_active),
			COUNT(*) FILTER (WHERE i.is_active AND f.id IS NOT NULL),
			COUNT(*) FILTER (WHERE i.is_active AND (
				SELECT COUNT(*) FROM market.cash_candles_1d c
				WHERE c.instrument_id = i.id AND c.session_date < $1::date
			) >= 50),
			(SELECT COUNT(*) FROM market.daily_features WHERE feature_run_id = $2::uuid)
		FROM market.instruments i
		LEFT JOIN market.future_contracts f ON f.instrument_id = i.id AND f.is_active AND f.expiry >= $1::date;
	`, run.SessionDate, run.ID).Scan(&active, &futures, &history, &features)
	if err != nil {
		return err
	}
	status := "NOT_READY"
	if active > 0 && active == futures && active == history && active == features {
		status = "READY"
	}
	details, _ := json.Marshal(map[string]int{"minimum_daily_history": 50})
	_, err = r.db.Pool.Exec(ctx, `
		INSERT INTO market.data_readiness (
			session_date, status, active_instruments, active_future_contracts, symbols_with_history,
			daily_feature_rows, feature_run_id, checked_at, details
		) VALUES ($1::date, $2, $3, $4, $5, $6, $7::uuid, NOW(), $8::jsonb)
		ON CONFLICT (session_date) DO UPDATE SET
			status = EXCLUDED.status, active_instruments = EXCLUDED.active_instruments,
			active_future_contracts = EXCLUDED.active_future_contracts,
			symbols_with_history = EXCLUDED.symbols_with_history,
			daily_feature_rows = EXCLUDED.daily_feature_rows,
			feature_run_id = EXCLUDED.feature_run_id, checked_at = NOW(), details = EXCLUDED.details;
	`, run.SessionDate, status, active, futures, history, features, run.ID, details)
	return err
}

// SessionDates returns trading sessions with raw daily cash data in the requested
// inclusive range. It is used to publish the daily baselines required before an
// intraday replay can be built.
func (r *DailyFeatureRepo) SessionDates(ctx context.Context, from, to string) ([]string, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT DISTINCT session_date::text
		FROM market.cash_candles_1d
		WHERE session_date BETWEEN $1::date AND $2::date
		ORDER BY session_date;
	`, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var dates []string
	for rows.Next() {
		var sessionDate string
		if err := rows.Scan(&sessionDate); err != nil {
			return nil, err
		}
		dates = append(dates, sessionDate)
	}
	return dates, rows.Err()
}

// Published reports whether backend has already certified a daily feature run
// for this session. Maintenance uses this as its sole skip decision.
func (r *DailyFeatureRepo) Published(ctx context.Context, sessionDate string) (bool, error) {
	var status string
	err := r.db.Pool.QueryRow(ctx, `
		SELECT status FROM market.data_readiness WHERE session_date = $1::date;
	`, sessionDate).Scan(&status)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return status == "READY", nil
}
