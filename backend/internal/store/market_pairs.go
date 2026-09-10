package store

import (
	"context"
	"fmt"
)

type ActiveMarketPair struct {
	InstrumentID     int64
	Symbol           string
	CashToken        int64
	FutureContractID int64
	FutureToken      int64
}

func (r *MarketInstrumentRepo) ActivePairs(ctx context.Context) ([]ActiveMarketPair, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT i.id, i.symbol, i.cash_token, f.id, f.token
		FROM market.instruments i
		JOIN market.future_contracts f ON f.instrument_id = i.id AND f.is_active
		WHERE i.is_active
		ORDER BY i.symbol;
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	pairs := make([]ActiveMarketPair, 0)
	for rows.Next() {
		var pair ActiveMarketPair
		if err := rows.Scan(&pair.InstrumentID, &pair.Symbol, &pair.CashToken, &pair.FutureContractID, &pair.FutureToken); err != nil {
			return nil, err
		}
		pairs = append(pairs, pair)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(pairs) == 0 {
		return nil, fmt.Errorf("no active market instrument pairs found")
	}
	return pairs, nil
}
