package store

import (
	"context"
	"fmt"
	"time"
)

type UniversePair struct {
	Symbol            string
	Name              string
	CashToken         int64
	CashTickSize      float64
	FutureToken       int64
	FutureTradingCode string
	FutureExpiry      time.Time
	FutureLotSize     int
	FutureTickSize    float64
}

type MarketInstrumentRepo struct{ db *DB }

func NewMarketInstrumentRepo(db *DB) *MarketInstrumentRepo {
	return &MarketInstrumentRepo{db: db}
}

func (r *MarketInstrumentRepo) ReplaceActiveUniverse(ctx context.Context, pairs []UniversePair) error {
	if len(pairs) == 0 {
		return fmt.Errorf("refusing to replace the active universe with no instruments")
	}

	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	symbols := make([]string, 0, len(pairs))
	for _, pair := range pairs {
		var instrumentID int64
		err := tx.QueryRow(ctx, `
			INSERT INTO market.instruments (symbol, name, cash_token, tick_size, is_active, updated_at)
			VALUES ($1, $2, $3, $4, TRUE, NOW())
			ON CONFLICT (symbol) DO UPDATE SET
				name = EXCLUDED.name, cash_token = EXCLUDED.cash_token, tick_size = EXCLUDED.tick_size,
				is_active = TRUE, updated_at = NOW()
			RETURNING id;
		`, pair.Symbol, pair.Name, pair.CashToken, pair.CashTickSize).Scan(&instrumentID)
		if err != nil {
			return fmt.Errorf("upserting %s: %w", pair.Symbol, err)
		}

		if pair.FutureToken > 0 {
			if _, err := tx.Exec(ctx, `
				UPDATE market.future_contracts SET is_active = FALSE, updated_at = NOW()
				WHERE instrument_id = $1 AND token <> $2 AND is_active;
			`, instrumentID, pair.FutureToken); err != nil {
				return fmt.Errorf("deactivating old future for %s: %w", pair.Symbol, err)
			}

			if _, err := tx.Exec(ctx, `
				INSERT INTO market.future_contracts (
					instrument_id, token, trading_symbol, expiry, lot_size, tick_size, is_active, updated_at
				) VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW())
				ON CONFLICT (token) DO UPDATE SET
					instrument_id = EXCLUDED.instrument_id, trading_symbol = EXCLUDED.trading_symbol,
					expiry = EXCLUDED.expiry, lot_size = EXCLUDED.lot_size, tick_size = EXCLUDED.tick_size,
					is_active = TRUE, updated_at = NOW();
			`, instrumentID, pair.FutureToken, pair.FutureTradingCode, pair.FutureExpiry,
				pair.FutureLotSize, pair.FutureTickSize); err != nil {
				return fmt.Errorf("upserting future for %s: %w", pair.Symbol, err)
			}
		}
		symbols = append(symbols, pair.Symbol)
	}

	if _, err := tx.Exec(ctx, `UPDATE market.instruments SET is_active = FALSE, updated_at = NOW() WHERE is_active AND NOT (symbol = ANY($1));`, symbols); err != nil {
		return fmt.Errorf("deactivating removed instruments: %w", err)
	}
	if _, err := tx.Exec(ctx, `
		UPDATE market.future_contracts f SET is_active = FALSE, updated_at = NOW()
		FROM market.instruments i WHERE f.instrument_id = i.id AND NOT i.is_active AND f.is_active;
	`); err != nil {
		return fmt.Errorf("deactivating futures for removed instruments: %w", err)
	}
	return tx.Commit(ctx)
}

type ActiveInstrument struct {
	ID        int64
	Symbol    string
	Name      string
	Exchange  string
	CashToken int64
	TickSize  float64
}

func (r *MarketInstrumentRepo) GetActiveInstruments(ctx context.Context) ([]ActiveInstrument, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, symbol, name, exchange, cash_token, tick_size
		FROM market.instruments
		WHERE is_active = TRUE
		ORDER BY symbol;
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []ActiveInstrument
	for rows.Next() {
		var inst ActiveInstrument
		if err := rows.Scan(&inst.ID, &inst.Symbol, &inst.Name, &inst.Exchange, &inst.CashToken, &inst.TickSize); err != nil {
			return nil, err
		}
		list = append(list, inst)
	}
	return list, rows.Err()
}
