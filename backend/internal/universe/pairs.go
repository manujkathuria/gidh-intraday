package universe

import (
	"fmt"
	"sort"
	"time"

	"gidh-intraday/backend/internal/store"

	"github.com/zerodha/gokiteconnect/v4"
)

func BuildPairs(instruments kiteconnect.Instruments, now time.Time) ([]store.UniversePair, error) {
	type future struct {
		token       int64
		tradingCode string
		expiry      time.Time
		lotSize     int
		tickSize    float64
	}
	futures := make(map[string]future)
	for _, instrument := range instruments {
		if instrument.Segment != "NFO-FUT" || instrument.InstrumentType != "FUT" {
			continue
		}
		expiry := instrument.Expiry.Time
		if expiry.Before(now.Truncate(24 * time.Hour)) {
			continue
		}
		current, exists := futures[instrument.Name]
		if !exists || expiry.Before(current.expiry) {
			futures[instrument.Name] = future{
				token: int64(instrument.InstrumentToken), tradingCode: instrument.Tradingsymbol,
				expiry: expiry, lotSize: int(instrument.LotSize), tickSize: instrument.TickSize,
			}
		}
	}

	pairs := make([]store.UniversePair, 0, len(futures))
	for _, instrument := range instruments {
		if instrument.Segment != "NSE" || instrument.InstrumentType != "EQ" {
			continue
		}

		future, hasFuture := futures[instrument.Tradingsymbol]
		if !hasFuture || future.lotSize <= 0 {
			continue
		}

		var futToken int64
		var futCode string
		var futExp time.Time
		var futLot int = 1
		var futTick float64 = 0.05

		if hasFuture && future.lotSize > 0 {
			futToken = future.token
			futCode = future.tradingCode
			futExp = future.expiry
			futLot = future.lotSize
			futTick = future.tickSize
		}

		pairs = append(pairs, store.UniversePair{
			Symbol: instrument.Tradingsymbol, Name: instrument.Name,
			CashToken: int64(instrument.InstrumentToken), CashTickSize: instrument.TickSize,
			FutureToken: futToken, FutureTradingCode: futCode,
			FutureExpiry: futExp, FutureLotSize: futLot, FutureTickSize: futTick,
		})
	}

	sort.Slice(pairs, func(i, j int) bool { return pairs[i].Symbol < pairs[j].Symbol })
	if len(pairs) == 0 {
		return nil, fmt.Errorf("no NSE equity / active NFO future pairs found")
	}
	return pairs, nil
}
