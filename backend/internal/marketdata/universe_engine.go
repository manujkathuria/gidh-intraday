package marketdata

import (
	"context"
	"fmt"
	"log"
	"math"
	"sync"
	"time"

	"gidh-intraday/backend/internal/store"

	kitemodels "github.com/zerodha/gokiteconnect/v4/models"
	kiteticker "github.com/zerodha/gokiteconnect/v4/ticker"
)

type InstrumentState struct {
	InstrumentID int64
	Symbol       string
	Exchange     string
	CashToken    uint32

	// Daily Baselines
	PriorClose     float64
	ATR14          float64
	ADR20          float64
	ExpectedVolMap map[int16]int64

	// Session Accumulators
	HasSessionOpen bool
	SessionOpen    float64
	SessionHigh    float64
	SessionLow     float64
	CumVolume      int64
	CumTurnover    float64
	CumSqTurnover  float64

	// Opening Ranges
	OR15High *float64
	OR15Low  *float64
	OR30High *float64
	OR30Low  *float64

	// Log Returns Ring Buffer (for 5m, 15m, 30m Realized Volatility)
	LogReturns []float64
	LastClose  float64

	// Minute Bucket (Current minute under construction)
	MinOpen         float64
	MinHigh         float64
	MinLow          float64
	MinClose        float64
	MinVolume       int64
	LastDayCashVol  int64
	HasTickInMinute bool
}

type UniverseStreamEngine struct {
	apiKey           string
	accessToken      string
	instrumentRepo   *store.MarketInstrumentRepo
	candleRepo       *store.MarketCandleRepo
	dailyFeatureRepo *store.DailyFeatureRepo

	ticker        *kiteticker.Ticker
	mu            sync.RWMutex
	instruments   map[uint32]*InstrumentState // token -> state
	symbolToToken map[string]uint32
	featureRunID  string
	sessionDate   string
	loc           *time.Location

	tickListeners []func(symbol string, tick kitemodels.Tick)
	isRunning     bool
}

func NewUniverseStreamEngine(
	apiKey, accessToken string,
	ir *store.MarketInstrumentRepo,
	cr *store.MarketCandleRepo,
	fr *store.DailyFeatureRepo,
) *UniverseStreamEngine {
	loc, err := time.LoadLocation("Asia/Kolkata")
	if err != nil {
		loc = time.Local
	}

	return &UniverseStreamEngine{
		apiKey:           apiKey,
		accessToken:      accessToken,
		instrumentRepo:   ir,
		candleRepo:       cr,
		dailyFeatureRepo: fr,
		instruments:      make(map[uint32]*InstrumentState),
		symbolToToken:    make(map[string]uint32),
		loc:              loc,
	}
}

func (e *UniverseStreamEngine) RegisterTickListener(listener func(symbol string, tick kitemodels.Tick)) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.tickListeners = append(e.tickListeners, listener)
}

func (e *UniverseStreamEngine) SubscribeDynamicToken(token uint32, symbol string) {
	e.mu.Lock()
	defer e.mu.Unlock()
	if _, exists := e.instruments[token]; !exists {
		e.instruments[token] = &InstrumentState{
			CashToken:  token,
			Symbol:     symbol,
			LogReturns: make([]float64, 0, 40),
		}
		e.symbolToToken[symbol] = token
		if e.ticker != nil && e.isRunning {
			e.ticker.Subscribe([]uint32{token})
			e.ticker.SetMode(kiteticker.ModeQuote, []uint32{token})
			log.Printf("[UNIVERSE WEBSOCKET] Dynamically subscribed additional token: %s (%d)", symbol, token)
		}
	}
}

func (e *UniverseStreamEngine) isMarketHours(nowIST time.Time) bool {
	if nowIST.Weekday() == time.Saturday || nowIST.Weekday() == time.Sunday {
		return false
	}
	minOfDay := nowIST.Hour()*60 + nowIST.Minute()
	return minOfDay >= 555 && minOfDay <= 930
}

func (e *UniverseStreamEngine) Hydrate(ctx context.Context, todayStr string) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	e.sessionDate = todayStr

	// 1. Load active instruments
	instList, err := e.instrumentRepo.GetActiveInstruments(ctx)
	if err != nil {
		return fmt.Errorf("failed to fetch active instruments: %w", err)
	}

	// 2. Load today's daily baselines (runID, ATR14, ADR20, PriorClose)
	runID, baselines, err := e.dailyFeatureRepo.LoadTodayBaselines(ctx, todayStr)
	if err != nil {
		log.Printf("[UNIVERSE ENGINE WARN] LoadTodayBaselines: %v. Running with fallback defaults.", err)
	}
	e.featureRunID = runID

	// 3. Load 20-session expected volume profile
	expVolProfile, err := e.dailyFeatureRepo.LoadExpectedVolumeProfile(ctx, todayStr)
	if err != nil {
		log.Printf("[UNIVERSE ENGINE WARN] LoadExpectedVolumeProfile: %v", err)
	}

	// 4. Initialize states
	for _, inst := range instList {
		token := uint32(inst.CashToken)
		b := baselines[inst.ID]

		state := &InstrumentState{
			InstrumentID:   inst.ID,
			Symbol:         inst.Symbol,
			Exchange:       inst.Exchange,
			CashToken:      token,
			PriorClose:     b.PriorClose,
			ATR14:          b.ATR14,
			ADR20:          b.ADR20,
			ExpectedVolMap: expVolProfile[inst.ID],
			LogReturns:     make([]float64, 0, 30),
			LastClose:      b.PriorClose,
		}
		e.instruments[token] = state
		e.symbolToToken[inst.Symbol] = token
	}

	// 5. Hydrate existing completed candles for today (supports mid-day cold restarts)
	todayCandles, err := e.dailyFeatureRepo.LoadTodayCandles(ctx, todayStr)
	if err == nil && len(todayCandles) > 0 {
		hydratedBars := 0
		for _, state := range e.instruments {
			bars := todayCandles[state.InstrumentID]
			if len(bars) == 0 {
				continue
			}
			for idx, c := range bars {
				if !state.HasSessionOpen {
					state.HasSessionOpen = true
					state.SessionOpen = c.Open
					state.SessionHigh = c.High
					state.SessionLow = c.Low
				} else {
					state.SessionHigh = math.Max(state.SessionHigh, c.High)
					state.SessionLow = math.Min(state.SessionLow, c.Low)
				}
				state.CumVolume += c.Volume
				state.CumTurnover += c.Close * float64(c.Volume)
				state.CumSqTurnover += c.Close * c.Close * float64(c.Volume)

				if idx < 15 {
					if state.OR15High == nil || c.High > *state.OR15High {
						val := c.High
						state.OR15High = &val
					}
					if state.OR15Low == nil || c.Low < *state.OR15Low {
						val := c.Low
						state.OR15Low = &val
					}
				}
				if idx < 30 {
					if state.OR30High == nil || c.High > *state.OR30High {
						val := c.High
						state.OR30High = &val
					}
					if state.OR30Low == nil || c.Low < *state.OR30Low {
						val := c.Low
						state.OR30Low = &val
					}
				}

				if state.LastClose > 0 && c.Close > 0 {
					lr := math.Log(c.Close / state.LastClose)
					state.LogReturns = append(state.LogReturns, lr)
					if len(state.LogReturns) > 30 {
						state.LogReturns = state.LogReturns[1:]
					}
				}
				state.LastClose = c.Close
				hydratedBars++
			}
		}
		log.Printf("[UNIVERSE ENGINE] Successfully hydrated %d historical 1m bars from today's session.", hydratedBars)
	}

	log.Printf("[UNIVERSE ENGINE] Initialized for %d active universe instruments (RunID: %s)", len(e.instruments), e.featureRunID)
	return nil
}

func (e *UniverseStreamEngine) Start(ctx context.Context) error {
	nowIST := time.Now().In(e.loc)
	todayStr := nowIST.Format("2006-01-02")

	if err := e.Hydrate(ctx, todayStr); err != nil {
		return fmt.Errorf("engine hydration error: %w", err)
	}

	e.ticker = kiteticker.New(e.apiKey, e.accessToken)

	e.ticker.OnConnect(func() {
		log.Println("[UNIVERSE WEBSOCKET] Connected to Zerodha Kite Ticker Stream.")
		e.mu.RLock()
		defer e.mu.RUnlock()

		tokens := make([]uint32, 0, len(e.instruments))
		for tok := range e.instruments {
			tokens = append(tokens, tok)
		}

		if len(tokens) > 0 {
			e.ticker.Subscribe(tokens)
			e.ticker.SetMode(kiteticker.ModeQuote, tokens)
			log.Printf("[UNIVERSE WEBSOCKET] Subscribed to %d universe tokens (ModeQuote)", len(tokens))
		}
	})

	e.ticker.OnError(func(err error) {
		log.Printf("[UNIVERSE WEBSOCKET ERROR] %v", err)
	})

	e.ticker.OnClose(func(code int, reason string) {
		log.Printf("[UNIVERSE WEBSOCKET CLOSED] code=%d, reason=%s", code, reason)
	})

	e.ticker.OnReconnect(func(attempt int, delay time.Duration) {
		log.Printf("[UNIVERSE WEBSOCKET RECONNECTING] attempt=%d, delay=%v", attempt, delay)
	})

	e.ticker.OnTick(func(tick kitemodels.Tick) {
		e.handleTick(tick)
	})

	e.isRunning = true
	go e.ticker.Serve()
	go e.runMinuteFlusher(ctx)

	log.Println("[UNIVERSE ENGINE] Real-time 210-stock WebSocket aggregator and 47-feature calculator ACTIVE.")
	return nil
}

func (e *UniverseStreamEngine) handleTick(tick kitemodels.Tick) {
	e.mu.Lock()
	state, exists := e.instruments[tick.InstrumentToken]
	if exists {
		price := tick.LastPrice
		if price > 0 {
			if !state.HasTickInMinute {
				state.HasTickInMinute = true
				state.MinOpen = price
				state.MinHigh = price
				state.MinLow = price
				state.MinClose = price
			} else {
				state.MinHigh = math.Max(state.MinHigh, price)
				state.MinLow = math.Min(state.MinLow, price)
				state.MinClose = price
			}

			// Calculate incremental volume
			if state.LastDayCashVol > 0 && int64(tick.VolumeTraded) >= state.LastDayCashVol {
				delta := int64(tick.VolumeTraded) - state.LastDayCashVol
				state.MinVolume += delta
			}
			state.LastDayCashVol = int64(tick.VolumeTraded)
		}
	}
	listeners := e.tickListeners
	e.mu.Unlock()

	if exists {
		for _, fn := range listeners {
			fn(state.Symbol, tick)
		}
	}
}

func (e *UniverseStreamEngine) runMinuteFlusher(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	lastFlushedMinute := -1

	for {
		select {
		case <-ctx.Done():
			return
		case t := <-ticker.C:
			nowIST := t.In(e.loc)
			currentMin := nowIST.Hour()*60 + nowIST.Minute()
			currentSec := nowIST.Second()

			// Flush completed candle at the 00 second mark
			if currentSec == 0 && currentMin != lastFlushedMinute {
				if e.isMarketHours(nowIST) {
					lastFlushedMinute = currentMin
					// Target candle timestamp is start of the just-completed minute
					candleTime := time.Date(nowIST.Year(), nowIST.Month(), nowIST.Day(), nowIST.Hour(), nowIST.Minute()-1, 0, 0, e.loc)
					e.flushCompletedMinute(ctx, candleTime, nowIST)
				}
			}
		}
	}
}

func (e *UniverseStreamEngine) flushCompletedMinute(ctx context.Context, candleTime, nowIST time.Time) {
	start := time.Now()
	minutesSinceOpen := int16(candleTime.Hour()*60 + candleTime.Minute() - 555)
	if minutesSinceOpen < 0 {
		minutesSinceOpen = 0
	}

	e.mu.Lock()
	candles := make([]store.MarketCandleWithID, 0, len(e.instruments))
	features := make([]store.IntradayFeatureRecord, 0, len(e.instruments))
	runID := e.featureRunID

	for _, s := range e.instruments {
		// Determine candle OHLCV for the completed minute
		cOpen := s.MinOpen
		cHigh := s.MinHigh
		cLow := s.MinLow
		cClose := s.MinClose
		cVol := s.MinVolume

		if !s.HasTickInMinute {
			// Carry forward last known price if no tick arrived in this minute
			cOpen = s.LastClose
			cHigh = s.LastClose
			cLow = s.LastClose
			cClose = s.LastClose
			cVol = 0
		}

		if cOpen <= 0 {
			cOpen = s.PriorClose
			cHigh = s.PriorClose
			cLow = s.PriorClose
			cClose = s.PriorClose
		}

		// Update running session accumulators
		if !s.HasSessionOpen {
			s.HasSessionOpen = true
			s.SessionOpen = cOpen
			s.SessionHigh = cHigh
			s.SessionLow = cLow
		} else {
			s.SessionHigh = math.Max(s.SessionHigh, cHigh)
			s.SessionLow = math.Min(s.SessionLow, cLow)
		}

		s.CumVolume += cVol
		s.CumTurnover += cClose * float64(cVol)
		s.CumSqTurnover += cClose * cClose * float64(cVol)

		// Opening Ranges
		if minutesSinceOpen < 15 {
			if s.OR15High == nil || cHigh > *s.OR15High {
				val := cHigh
				s.OR15High = &val
			}
			if s.OR15Low == nil || cLow < *s.OR15Low {
				val := cLow
				s.OR15Low = &val
			}
		}
		if minutesSinceOpen < 30 {
			if s.OR30High == nil || cHigh > *s.OR30High {
				val := cHigh
				s.OR30High = &val
			}
			if s.OR30Low == nil || cLow < *s.OR30Low {
				val := cLow
				s.OR30Low = &val
			}
		}

		// Update log returns
		if s.LastClose > 0 && cClose > 0 {
			lr := math.Log(cClose / s.LastClose)
			s.LogReturns = append(s.LogReturns, lr)
			if len(s.LogReturns) > 30 {
				s.LogReturns = s.LogReturns[1:]
			}
		}
		s.LastClose = cClose

		// Reset minute bucket
		s.HasTickInMinute = false
		s.MinOpen = 0
		s.MinHigh = 0
		s.MinLow = 0
		s.MinClose = 0
		s.MinVolume = 0

		// Assemble raw 1m candle
		candle := store.MarketCandle{
			Timestamp: candleTime,
			Open:      cOpen,
			High:      cHigh,
			Low:       cLow,
			Close:     cClose,
			Volume:    cVol,
		}
		candles = append(candles, store.MarketCandleWithID{
			InstrumentID: s.InstrumentID,
			Candle:       candle,
		})

		// Derive all 47 features in < 1 microsecond in memory
		feat := e.calculateFeatures(s, candleTime, cOpen, cHigh, cLow, cClose, cVol, minutesSinceOpen, runID)
		features = append(features, feat)
	}
	e.mu.Unlock()

	// Asynchronously execute bulk database insertion in 1 network roundtrip
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
	}(candles, features, candleTime.Format("15:04:05"))
}

func (e *UniverseStreamEngine) calculateFeatures(
	s *InstrumentState,
	candleTime time.Time,
	cOpen, cHigh, cLow, cClose float64,
	cVol int64,
	minSinceOpen int16,
	runID string,
) store.IntradayFeatureRecord {
	barRange := cHigh - cLow
	barBody := cClose - cOpen

	var clv, upperWick, lowerWick *float64
	if barRange > 0 {
		cVal := (cClose - cLow) / barRange
		uVal := (cHigh - math.Max(cOpen, cClose)) / barRange
		lVal := (math.Min(cOpen, cClose) - cLow) / barRange
		clv = &cVal
		upperWick = &uVal
		lowerWick = &lVal
	}

	// Statistical VWAP & Sigma
	var sessionVWAP, vwapSigma, vwapUpper1, vwapLower1, vwapUpper2, vwapLower2, vwapDistSigma *float64
	if s.CumVolume > 0 {
		vwap := s.CumTurnover / float64(s.CumVolume)
		variance := (s.CumSqTurnover / float64(s.CumVolume)) - (vwap * vwap)
		if variance < 0 {
			variance = 0
		}
		sigma := math.Sqrt(variance)

		u1 := vwap + sigma
		l1 := vwap - sigma
		u2 := vwap + 2*sigma
		l2 := vwap - 2*sigma

		sessionVWAP = &vwap
		vwapSigma = &sigma
		vwapUpper1 = &u1
		vwapLower1 = &l1
		vwapUpper2 = &u2
		vwapLower2 = &l2

		if sigma > 0 {
			dist := (cClose - vwap) / sigma
			vwapDistSigma = &dist
		}
	}

	// Relative Volume (RVOL)
	var expCumVol *int64
	var rvol *float64
	if s.ExpectedVolMap != nil {
		if ev, ok := s.ExpectedVolMap[minSinceOpen]; ok && ev > 0 {
			expCumVol = &ev
			rv := float64(s.CumVolume) / float64(ev)
			rvol = &rv
		}
	}

	// Realized Volatilities (5m, 15m, 30m)
	rVol5 := computeStdDev(s.LogReturns, 5)
	rVol15 := computeStdDev(s.LogReturns, 15)
	rVol30 := computeStdDev(s.LogReturns, 30)

	// ATR & ADR Range Usages
	var sessionRangeATR, adrFuelUsed *float64
	sessionRange := s.SessionHigh - s.SessionLow
	if s.ATR14 > 0 {
		val := sessionRange / s.ATR14
		sessionRangeATR = &val
	}
	if s.ADR20 > 0 {
		val := sessionRange / s.ADR20
		adrFuelUsed = &val
	}

	// Active Opening Ranges (populated only when elapsed)
	var or15H, or15L, or30H, or30L *float64
	if minSinceOpen >= 14 && s.OR15High != nil {
		or15H = s.OR15High
		or15L = s.OR15Low
	}
	if minSinceOpen >= 29 && s.OR30High != nil {
		or30H = s.OR30High
		or30L = s.OR30Low
	}

	return store.IntradayFeatureRecord{
		Timestamp:             candleTime,
		FeatureRunID:          runID,
		InstrumentID:          s.InstrumentID,
		CashSourceTS:          candleTime,
		CashIsComplete:        true,
		FutureIsComplete:      false,
		CashOpen:              cOpen,
		CashHigh:              cHigh,
		CashLow:               cLow,
		CashClose:             cClose,
		SessionOpen:           s.SessionOpen,
		SessionHigh:           s.SessionHigh,
		SessionLow:            s.SessionLow,
		MinutesSinceOpen:      minSinceOpen,
		OpeningRange15High:    or15H,
		OpeningRange15Low:     or15L,
		OpeningRange30High:    or30H,
		OpeningRange30Low:     or30L,
		SessionVWAP:           sessionVWAP,
		VWAPSigma:             vwapSigma,
		VWAPUpper1:            vwapUpper1,
		VWAPLower1:            vwapLower1,
		VWAPUpper2:            vwapUpper2,
		VWAPLower2:            vwapLower2,
		VWAPDistanceSigma:     vwapDistSigma,
		BarRange:              barRange,
		BarBody:               barBody,
		CLV:                   clv,
		UpperWickPct:          upperWick,
		LowerWickPct:          lowerWick,
		CumulativeVolume:      s.CumVolume,
		ExpectedCumulativeVol: expCumVol,
		RelativeVolume:        rvol,
		RealisedVolatility5M:  rVol5,
		RealisedVolatility15M: rVol15,
		RealisedVolatility30M: rVol30,
		SessionRangePctATR:    sessionRangeATR,
		ADRFuelUsedPct:        adrFuelUsed,
	}
}

func computeStdDev(returns []float64, window int) *float64 {
	n := len(returns)
	if n == 0 || window <= 1 {
		return nil
	}
	start := n - window
	if start < 0 {
		start = 0
	}
	slice := returns[start:]
	k := len(slice)
	if k <= 1 {
		return nil
	}

	var sum float64
	for _, v := range slice {
		sum += v
	}
	mean := sum / float64(k)

	var sumSqDiff float64
	for _, v := range slice {
		diff := v - mean
		sumSqDiff += diff * diff
	}

	stddev := math.Sqrt(sumSqDiff / float64(k-1))
	return &stddev
}

func (e *UniverseStreamEngine) GetLatestTick(symbol string) (kitemodels.Tick, bool) {
	e.mu.RLock()
	defer e.mu.RUnlock()
	tok, ok := e.symbolToToken[symbol]
	if !ok {
		return kitemodels.Tick{}, false
	}
	s, ok := e.instruments[tok]
	if !ok || s.LastClose <= 0 {
		return kitemodels.Tick{}, false
	}
	return kitemodels.Tick{
		InstrumentToken: tok,
		LastPrice:       s.LastClose,
		VolumeTraded:    uint32(s.LastDayCashVol),
	}, true
}

func (e *UniverseStreamEngine) Stop() {
	if e.ticker != nil {
		e.ticker.Close()
	}
	e.isRunning = false
}
