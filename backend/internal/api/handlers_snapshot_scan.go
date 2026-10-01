package api

import (
	"gidh-intraday/backend/internal/sector"

	"github.com/jackc/pgx/v5"
)

type sectorAcc struct {
	count, aboveCount int
	sumMove, sumRvol  float64
}

func (s *Server) scanSnapshotStocks(rows pgx.Rows) ([]*Stock, int, map[string]*sectorAcc) {
	stocks := []*Stock{}
	aboveVwap := 0
	sectorStats := make(map[string]*sectorAcc)

	for rows.Next() {
		var stk Stock
		var vol int64
		if err := rows.Scan(
			&stk.Symbol, &stk.Sector, &stk.Price, &stk.MovePct, &stk.GapPct,
			&stk.Vwap, &stk.VwapDistPct, &stk.Rvol, &stk.Clv, &vol, &stk.IsAboveVwap,
			&stk.Pdh, &stk.Pdl, &stk.OiLatest, &stk.OiChangePct, &stk.VwapSigma,
		); err != nil {
			continue
		}

		if stk.Sector == "" || stk.Sector == "N/A" || stk.Sector == "OTHERS" {
			if fb := sector.Resolve(stk.Symbol); fb != "" && fb != "OTHERS" {
				stk.Sector = fb
			}
		}
		stk.Volume = float64(vol)
		if stk.IsAboveVwap {
			aboveVwap++
		}
		stocks = append(stocks, &stk)

		st := sectorStats[stk.Sector]
		if st == nil {
			st = &sectorAcc{}
			sectorStats[stk.Sector] = st
		}
		st.count++
		st.sumMove += stk.MovePct
		st.sumRvol += stk.Rvol
		if stk.IsAboveVwap {
			st.aboveCount++
		}
	}
	return stocks, aboveVwap, sectorStats
}
