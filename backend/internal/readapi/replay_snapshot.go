package readapi

import (
	"context"
	"fmt"
	"math"
	"sort"
	"time"
)

func (r *Repository) ReplaySnapshot(ctx context.Context, sessionDate, asOfTime string) (*ReplaySnapshotResponse, error) {
	loc, err := time.LoadLocation("Asia/Kolkata")
	if err != nil {
		loc = time.Local
	}
	todayStr := time.Now().In(loc).Format("2006-01-02")
	isToday := sessionDate == todayStr

	if !isToday && r.redis != nil {
		if cached, ok := r.redis.GetSnapshot(ctx, sessionDate, asOfTime); ok {
			return cached, nil
		}
	}

	if asOfTime <= "09:14:00" {
		res, err := r.preopenBaseline(ctx, sessionDate, asOfTime)
		if err == nil && !isToday && r.redis != nil {
			r.redis.SetSnapshot(ctx, sessionDate, asOfTime, res)
		}
		return res, err
	}

	rows, err := r.db.Pool.Query(ctx, replaySnapshotSQL, sessionDate, asOfTime)
	if err != nil {
		return nil, fmt.Errorf("query replay snapshot: %w", err)
	}
	defer rows.Close()

	stocks := []ReplayStock{}
	aboveCount := 0
	sectorStats := map[string]*struct {
		Count, AboveCount int
		SumMove, SumRVOL  float64
	}{}

	for rows.Next() {
		var s ReplayStock
		if err := rows.Scan(&s.Symbol, &s.GapPct, &s.MovePct, &s.VWAPDistPct, &s.RVOL, &s.CLV, &s.Price, &s.VWAP, &s.Volume); err != nil {
			return nil, err
		}
		s.Sector = GetSector(s.Symbol)
		s.IsAboveVWAP = s.VWAPDistPct >= 0
		if s.IsAboveVWAP {
			aboveCount++
		}

		if _, exists := sectorStats[s.Sector]; !exists {
			sectorStats[s.Sector] = &struct {
				Count, AboveCount int
				SumMove, SumRVOL  float64
			}{}
		}
		st := sectorStats[s.Sector]
		st.Count++
		st.SumMove += s.MovePct
		st.SumRVOL += s.RVOL
		if s.IsAboveVWAP {
			st.AboveCount++
		}
		stocks = append(stocks, s)
	}

	total := len(stocks)
	pctAbove := 0.0
	if total > 0 {
		pctAbove = math.Round((float64(aboveCount)/float64(total)*100)*10) / 10
	}

	sectors := []ReplaySector{}
	secMoveMap := map[string]float64{}
	for secName, st := range sectorStats {
		avgMove := math.Round((st.SumMove/float64(st.Count))*100) / 100
		avgRVOL := math.Round((st.SumRVOL/float64(st.Count))*100) / 100
		pctAboveSec := math.Round((float64(st.AboveCount)/float64(st.Count)*100)*10) / 10
		secMoveMap[secName] = avgMove

		sectors = append(sectors, ReplaySector{
			Sector:       secName,
			CivCount:     st.Count,
			AvgMovePct:   avgMove,
			AvgRVOL:      avgRVOL,
			PctAboveVWAP: pctAboveSec,
		})
	}
	sort.Slice(sectors, func(i, j int) bool {
		return sectors[i].AvgMovePct > sectors[j].AvgMovePct
	})

	traps := detectTraps(stocks, secMoveMap)

	res := &ReplaySnapshotResponse{
		SessionDate: sessionDate,
		AsOfTime:    asOfTime,
		Weather: ReplayWeather{
			TotalCivs:    total,
			AboveVWAP:    aboveCount,
			BelowVWAP:    total - aboveCount,
			PctAboveVWAP: pctAbove,
		},
		Stocks:  stocks,
		Sectors: sectors,
		Traps:   traps,
	}

	if !isToday && r.redis != nil {
		r.redis.SetSnapshot(ctx, sessionDate, asOfTime, res)
	}
	return res, nil
}
