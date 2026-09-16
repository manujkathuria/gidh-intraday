package readapi

import (
	"context"
	"fmt"
	"sort"
)

func (r *Repository) preopenBaseline(ctx context.Context, sessionDate, asOfTime string) (*ReplaySnapshotResponse, error) {
	query := `
	WITH prev_date AS (
		SELECT DISTINCT date(ts AT TIME ZONE 'Asia/Kolkata') as dt
		FROM market.cash_candles_1m
		WHERE (ts AT TIME ZONE 'Asia/Kolkata')::date < $1::date
		ORDER BY dt DESC LIMIT 1
	)
	SELECT DISTINCT ON (i.symbol)
		i.symbol,
		c.close as prev_close
	FROM market.cash_candles_1m c 
	JOIN market.instruments i ON c.instrument_id = i.id
	WHERE (c.ts AT TIME ZONE 'Asia/Kolkata')::date = (SELECT dt FROM prev_date)
	ORDER BY i.symbol, c.ts DESC;
	`

	rows, err := r.db.Pool.Query(ctx, query, sessionDate)
	if err != nil {
		return nil, fmt.Errorf("query preopen baseline: %w", err)
	}
	defer rows.Close()

	stocks := []ReplayStock{}
	sectorMap := map[string]*ReplaySector{}

	for rows.Next() {
		var sym string
		var prevClose float64
		if err := rows.Scan(&sym, &prevClose); err != nil {
			return nil, err
		}
		sec := GetSector(sym)
		stocks = append(stocks, ReplayStock{
			Symbol:      sym,
			Sector:      sec,
			Price:       prevClose,
			GapPct:      0.0,
			MovePct:     0.0,
			VWAP:        prevClose,
			VWAPDistPct: 0.0,
			RVOL:        0.0,
			CLV:         0.5,
			Volume:      0,
			IsAboveVWAP: true,
		})

		if _, exists := sectorMap[sec]; !exists {
			sectorMap[sec] = &ReplaySector{
				Sector:       sec,
				CivCount:     0,
				AvgMovePct:   0.0,
				AvgRVOL:      0.0,
				PctAboveVWAP: 100.0,
			}
		}
		sectorMap[sec].CivCount++
	}

	sectors := []ReplaySector{}
	for _, s := range sectorMap {
		sectors = append(sectors, *s)
	}
	sort.Slice(sectors, func(i, j int) bool {
		return sectors[i].CivCount > sectors[j].CivCount
	})

	return &ReplaySnapshotResponse{
		SessionDate: sessionDate,
		AsOfTime:    asOfTime,
		Weather: ReplayWeather{
			TotalCivs:    len(stocks),
			AboveVWAP:    len(stocks),
			BelowVWAP:    0,
			PctAboveVWAP: 100.0,
		},
		Stocks:  stocks,
		Sectors: sectors,
		Traps:   []ReplayTrap{},
	}, nil
}
