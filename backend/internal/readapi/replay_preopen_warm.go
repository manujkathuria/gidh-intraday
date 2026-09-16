package readapi

import (
	"context"
	"fmt"
	"sort"
)

func (r *Repository) PrepopulatePreopenBaselines(ctx context.Context) error {
	if r.redis == nil {
		return nil
	}

	query := `
	WITH ranked_days AS (
		SELECT c.session_date, i.symbol, c.close as prev_close
		FROM market.cash_candles_1d c
		JOIN market.instruments i ON c.instrument_id = i.id
		ORDER BY c.session_date ASC, i.symbol ASC
	)
	SELECT session_date::text, symbol, prev_close FROM ranked_days;
	`

	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return fmt.Errorf("query all daily closes: %w", err)
	}
	defer rows.Close()

	type stockDay struct {
		symbol    string
		prevClose float64
	}
	daysMap := map[string][]stockDay{}

	for rows.Next() {
		var sDate, sym string
		var prevClose float64
		if err := rows.Scan(&sDate, &sym, &prevClose); err != nil {
			return err
		}
		daysMap[sDate] = append(daysMap[sDate], stockDay{symbol: sym, prevClose: prevClose})
	}

	for sDate, stockList := range daysMap {
		stocks := []ReplayStock{}
		sectorMap := map[string]*ReplaySector{}

		for _, s := range stockList {
			sec := GetSector(s.symbol)
			stocks = append(stocks, ReplayStock{
				Symbol:      s.symbol,
				Sector:      sec,
				Price:       s.prevClose,
				GapPct:      0.0,
				MovePct:     0.0,
				VWAP:        s.prevClose,
				VWAPDistPct: 0.0,
				RVOL:        0.0,
				CLV:         0.5,
				Volume:      0,
				IsAboveVWAP: true,
			})

			if _, exists := sectorMap[sec]; !exists {
				sectorMap[sec] = &ReplaySector{Sector: sec, CivCount: 0, AvgMovePct: 0.0, AvgRVOL: 0.0, PctAboveVWAP: 100.0}
			}
			sectorMap[sec].CivCount++
		}

		sectors := []ReplaySector{}
		for _, secObj := range sectorMap {
			sectors = append(sectors, *secObj)
		}
		sort.Slice(sectors, func(i, j int) bool {
			return sectors[i].CivCount > sectors[j].CivCount
		})

		snap := &ReplaySnapshotResponse{
			SessionDate: sDate,
			AsOfTime:    "09:14:00",
			Weather: ReplayWeather{
				TotalCivs:    len(stocks),
				AboveVWAP:    len(stocks),
				BelowVWAP:    0,
				PctAboveVWAP: 100.0,
			},
			Stocks:  stocks,
			Sectors: sectors,
			Traps:   []ReplayTrap{},
		}
		r.redis.SetSnapshot(ctx, sDate, "09:14:00", snap)
	}

	return nil
}
