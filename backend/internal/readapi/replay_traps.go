package readapi

import "fmt"

func detectTraps(stocks []ReplayStock, secMoveMap map[string]float64) []ReplayTrap {
	traps := []ReplayTrap{}
	for _, s := range stocks {
		secAvg := secMoveMap[s.Sector]

		// Bull Trap (Gap & Crap)
		if s.GapPct >= 1.2 && !s.IsAboveVWAP && s.CLV <= 0.25 {
			conf := "MEDIUM"
			if s.RVOL >= 3.0 {
				conf = "HIGH"
			}
			traps = append(traps, ReplayTrap{
				Symbol:      s.Symbol,
				Sector:      s.Sector,
				TrapType:    "BULL_TRAP (Gap & Crap)",
				Confidence:  conf,
				Description: fmt.Sprintf("Gapped +%.2f%% but collapsed below VWAP (CLV: %.2f). Trapped early buyers.", s.GapPct, s.CLV),
				MovePct:     s.MovePct,
				GapPct:      s.GapPct,
				RVOL:        s.RVOL,
				CLV:         s.CLV,
			})
		} else if s.GapPct <= -1.2 && s.IsAboveVWAP && s.CLV >= 0.75 {
			conf := "MEDIUM"
			if s.RVOL >= 3.0 {
				conf = "HIGH"
			}
			traps = append(traps, ReplayTrap{
				Symbol:      s.Symbol,
				Sector:      s.Sector,
				TrapType:    "BEAR_TRAP (Flush & Squeeze)",
				Confidence:  conf,
				Description: fmt.Sprintf("Gapped %.2f%% but violently reclaimed VWAP (CLV: %.2f). Short sellers trapped.", s.GapPct, s.CLV),
				MovePct:     s.MovePct,
				GapPct:      s.GapPct,
				RVOL:        s.RVOL,
				CLV:         s.CLV,
			})
		} else if s.MovePct >= 1.8 && secAvg <= -0.5 {
			traps = append(traps, ReplayTrap{
				Symbol:      s.Symbol,
				Sector:      s.Sector,
				TrapType:    "SECTOR_DIVERGENCE_TRAP",
				Confidence:  "MEDIUM",
				Description: fmt.Sprintf("Surging +%.2f%% while %s sector is weak (%.2f%%). High fade risk.", s.MovePct, s.Sector, secAvg),
				MovePct:     s.MovePct,
				GapPct:      s.GapPct,
				RVOL:        s.RVOL,
				CLV:         s.CLV,
			})
		}
	}
	return traps
}
