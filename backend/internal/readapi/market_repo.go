package readapi

import (
	"context"
	"fmt"
	"time"

	"gidh-intraday/backend/internal/store"
)

type Repository struct {
	db    *store.DB
	redis *RedisCache
}

func NewRepository(db *store.DB) *Repository {
	repo := &Repository{
		db:    db,
		redis: NewRedisCache(),
	}
	if repo.redis != nil {
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			_ = repo.PrepopulatePreopenBaselines(ctx)
		}()
	}
	return repo
}

func (r *Repository) Ping(ctx context.Context) error { return r.db.Pool.Ping(ctx) }

func (r *Repository) Universe(ctx context.Context) ([]UniverseItem, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT i.symbol, i.name, i.cash_token, i.tick_size, f.token, f.trading_symbol, f.expiry, f.lot_size, f.tick_size
		FROM market.instruments i
		JOIN market.future_contracts f ON f.instrument_id = i.id AND f.is_active
		WHERE i.is_active ORDER BY i.symbol;
	`)
	if err != nil {
		return nil, fmt.Errorf("query universe: %w", err)
	}
	defer rows.Close()
	items := []UniverseItem{}
	for rows.Next() {
		var item UniverseItem
		if err := rows.Scan(&item.Symbol, &item.Name, &item.CashToken, &item.CashTickSize, &item.FutureToken, &item.FutureTradingCode, &item.FutureExpiry, &item.FutureLotSize, &item.FutureTickSize); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) Sessions(ctx context.Context) ([]Session, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT r.session_date::text, r.id::text, r.feature_version, r.finished_at
		FROM market.feature_runs r
		JOIN market.data_readiness d ON d.feature_run_id = r.id AND d.status = 'READY'
		WHERE r.feature_set = 'DAILY' AND r.status = 'SUCCEEDED'
		ORDER BY r.session_date DESC;
	`)
	if err != nil {
		return nil, fmt.Errorf("query published sessions: %w", err)
	}
	defer rows.Close()
	sessions := []Session{}
	for rows.Next() {
		var session Session
		if err := rows.Scan(&session.Date, &session.FeatureRunID, &session.FeatureVersion, &session.PublishedAt); err != nil {
			return nil, err
		}
		sessions = append(sessions, session)
	}
	return sessions, rows.Err()
}
