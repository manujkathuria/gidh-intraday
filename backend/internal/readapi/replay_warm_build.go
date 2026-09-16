package readapi

import (
	"math"
	"sort"
)

func buildWarmSnapshot(
	sessionDate, timeStr string,
	accMap map[string]*symAcc,
	stockMetaMap map[string]StockMeta,
) *ReplaySnapshotResponse {
	stocks := []ReplayStock{}
	aboveCount := 0
	sectorStats := map[string]*struct {
		Count, AboveCount int
		SumMove, SumRVOL  float64
	}{}

	for sym, acc := range accMap {
		meta := stockMetaMap[sym]
		prevClose := meta.PrevClose
		if prevClose <= 0 {
			prevClose = acc.DayOpen
		}

		vwap := acc.LastPrice
		if acc.CumVol > 0 {
			vwap = acc.CumTurn / float64(acc.CumVol)
		}

		gapPct := 0.0
		if prevClose > 0 && acc.HasOpen {
			gapPct = math.Round(((acc.DayOpen-prevClose)/prevClose*100)*100) / 100
		}
		movePct := 0.0
		if prevClose > 0 {
			movePct = math.Round(((acc.LastPrice-prevClose)/prevClose*100)*100) / 100
		}
		vwapDistPct := 0.0
		if vwap > 0 {
			vwapDistPct = math.Round(((acc.LastPrice-vwap)/vwap*100)*100) / 100
		}
		rvol := 0.0
		if meta.AvgDailyVol > 0 {
			rvol = math.Round((float64(acc.CumVol)/meta.AvgDailyVol*100)*100) / 100
		}
		clv := 0.5
		if acc.High > acc.Low {
			clv = math.Round(((acc.LastPrice-acc.Low)/(acc.High-acc.Low))*100) / 100
		}

		isAbove := vwapDistPct >= 0
		if isAbove {
			aboveCount++
		}

		sec := GetSector(sym)
		if _, exists := sectorStats[sec]; !exists {
			sectorStats[sec] = &struct {
				Count, AboveCount int
				SumMove, SumRVOL  float64
			}{}
		}
		st := sectorStats[sec]
		st.Count++
		st.SumMove += movePct
		st.SumRVOL += rvol
		if isAbove {
			st.AboveCount++
		}

		stocks = append(stocks, ReplayStock{
			Symbol:      sym,
			Sector:      sec,
			Price:       acc.LastPrice,
			GapPct:      gapPct,
			MovePct:     movePct,
			VWAP:        vwap,
			VWAPDistPct: vwapDistPct,
			RVOL:        rvol,
			CLV:         clv,
			Volume:      acc.CumVol,
			IsAboveVWAP: isAbove,
		})
	}

	total := len(stocks)
	pctAbove := 0.0
	if total > 0 {
		pctAbove = math.Round((float64(aboveCount)/float64(total)*100)*10) / 10
	}

	sectors := []ReplaySector{}
	for secName, st := range sectorStats {
		avgMove := math.Round((st.SumMove/float64(st.Count))*100) / 100
		avgRVOL := math.Round((st.SumRVOL/float64(st.Count))*100) / 100
		pctAboveSec := math.Round((float64(st.AboveCount)/float64(st.Count)*100)*10) / 10

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
	sort.Slice(stocks, func(i, j int) bool {
		return stocks[i].RVOL > stocks[j].RVOL
	})

	return &ReplaySnapshotResponse{
		SessionDate: sessionDate,
		AsOfTime:    timeStr,
		Weather: ReplayWeather{
			TotalCivs:    total,
			AboveVWAP:    aboveCount,
			BelowVWAP:    total - aboveCount,
			PctAboveVWAP: pctAbove,
		},
		Stocks:  stocks,
		Sectors: sectors,
		Traps:   []ReplayTrap{},
	}
}
