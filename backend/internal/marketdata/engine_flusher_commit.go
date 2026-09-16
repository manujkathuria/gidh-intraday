package marketdata

import (
	"context"
	"log"
	"sync"
	"time"

	"gidh-intraday/backend/internal/store"
)

func (e *UniverseStreamEngine) commitFlushedMinute(
	candles []store.MarketCandleWithID,
	features []store.IntradayFeatureRecord,
	runID string,
	start time.Time,
	timeStr string,
) {
	go func(cList []store.MarketCandleWithID, fList []store.IntradayFeatureRecord, tStr string) {
		bgCtx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		var err1, err2 error
		var wg sync.WaitGroup
		wg.Add(2)

		go func() {
			defer wg.Done()
			err1 = e.candleRepo.UpsertCashMinuteBulk(bgCtx, cList)
		}()
		go func() {
			defer wg.Done()
			if runID != "" {
				err2 = e.dailyFeatureRepo.UpsertIntradayFeaturesBulk(bgCtx, fList)
			}
		}()
		wg.Wait()

		elapsed := time.Since(start)
		if err1 != nil || err2 != nil {
			log.Printf("[UNIVERSE FLUSH ERROR %s] Candles: %v | Features: %v (Elapsed: %v)", tStr, err1, err2, elapsed)
		} else {
			log.Printf("[UNIVERSE FLUSH %s] 210 candles & 210 intraday features committed (Elapsed: %v)", tStr, elapsed)
		}
	}(candles, features, timeStr)
}
