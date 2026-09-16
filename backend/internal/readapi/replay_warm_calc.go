package readapi

import (
	"context"
	"fmt"
)

type symAcc struct {
	DayOpen   float64
	LastPrice float64
	CumVol    int64
	CumTurn   float64
	Low       float64
	High      float64
	HasOpen   bool
}

func (r *Repository) processWarmSnapshots(
	ctx context.Context,
	sessionDate string,
	stockMetaMap map[string]StockMeta,
	timeGroupedBars map[string][]MinBar,
) {
	accMap := map[string]*symAcc{}
	allSnapshots := map[string]*ReplaySnapshotResponse{}

	for min := 555; min <= 930; min++ {
		timeStr := fmt.Sprintf("%02d:%02d:00", min/60, min%60)
		bars := timeGroupedBars[timeStr]

		for _, b := range bars {
			acc, ok := accMap[b.Symbol]
			if !ok {
				acc = &symAcc{
					DayOpen:   b.Open,
					LastPrice: b.Close,
					CumVol:    b.Volume,
					CumTurn:   b.Close * float64(b.Volume),
					Low:       b.Low,
					High:      b.High,
					HasOpen:   true,
				}
				accMap[b.Symbol] = acc
			} else {
				acc.LastPrice = b.Close
				acc.CumVol += b.Volume
				acc.CumTurn += b.Close * float64(b.Volume)
				if b.Low < acc.Low {
					acc.Low = b.Low
				}
				if b.High > acc.High {
					acc.High = b.High
				}
			}
		}

		allSnapshots[timeStr] = buildWarmSnapshot(sessionDate, timeStr, accMap, stockMetaMap)
	}

	_ = r.redis.SetDaySnapshots(ctx, sessionDate, allSnapshots)
}
