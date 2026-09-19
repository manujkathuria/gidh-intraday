package ordermanager

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

type InstrumentRepository interface {
	Resolve(context.Context, string) (Instrument, error)
	LatestPrice(context.Context, string) (float64, error)
}

func (r *PostgresInstrumentRepository) LatestPrice(ctx context.Context, symbol string) (float64, error) {
	if r == nil || r.pool == nil {
		return 0, fmt.Errorf("instrument repository is unavailable")
	}
	var price float64
	err := r.pool.QueryRow(ctx, `
		SELECT c.close
		FROM market.cash_candles_1m c
		JOIN market.instruments i ON i.id = c.instrument_id
		WHERE i.symbol = $1
		ORDER BY c.ts DESC
		LIMIT 1
	`, strings.ToUpper(strings.TrimSpace(symbol))).Scan(&price)
	if err != nil || price <= 0 {
		return 0, fmt.Errorf("latest price for %s is unavailable: %w", symbol, err)
	}
	return price, nil
}

type PostgresInstrumentRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresInstrumentRepository(pool *pgxpool.Pool) *PostgresInstrumentRepository {
	return &PostgresInstrumentRepository{pool: pool}
}

func (r *PostgresInstrumentRepository) Resolve(ctx context.Context, symbol string) (Instrument, error) {
	if r == nil || r.pool == nil {
		return Instrument{}, fmt.Errorf("instrument repository is unavailable")
	}
	symbol = strings.ToUpper(strings.TrimSpace(symbol))
	var instrument Instrument
	var token int64
	err := r.pool.QueryRow(ctx, `
		SELECT symbol, exchange, cash_token
		FROM market.instruments
		WHERE symbol = $1 AND is_active = TRUE
	`, symbol).Scan(&instrument.Symbol, &instrument.Exchange, &token)
	if err != nil {
		return Instrument{}, fmt.Errorf("active instrument %s not found: %w", symbol, err)
	}
	if token <= 0 {
		return Instrument{}, fmt.Errorf("active instrument %s has no cash token", symbol)
	}
	instrument.Token = uint32(token)
	return instrument, nil
}
