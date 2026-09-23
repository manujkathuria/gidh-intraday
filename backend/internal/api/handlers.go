package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	edgeauth "gidh-intraday/backend/internal/auth"
	"gidh-intraday/backend/internal/ordermanager"
	"gidh-intraday/backend/internal/sector"
	"gidh-intraday/backend/internal/store"

	"github.com/redis/go-redis/v9"
)

type Server struct {
	db     *store.DB
	redis  *redis.Client
	orders *ordermanager.Manager
}

func NewServer(db *store.DB, r *redis.Client, orders *ordermanager.Manager) *Server {
	return &Server{
		db:     db,
		redis:  r,
		orders: orders,
	}
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

// Market Status: GET /api/market/status
func (s *Server) HandleMarketStatus(w http.ResponseWriter, r *http.Request) {
	if s.redis == nil {
		writeJSON(w, http.StatusOK, map[string]interface{}{"isLive": false})
		return
	}
	ctx := r.Context()
	exists, err := s.redis.Exists(ctx, "gidh:live:active").Result()
	isLive := err == nil && exists > 0

	var liveDate *string
	dateStr, err := s.redis.Get(ctx, "gidh:live:session_date").Result()
	if err == nil && dateStr != "" {
		liveDate = &dateStr
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"isLive":   isLive,
		"liveDate": liveDate,
	})
}

// Trading Sessions: GET /api/market/sessions
func (s *Server) HandleSessions(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	rows, err := s.db.Pool.Query(ctx, `
		SELECT r.session_date::text, r.id::text, r.feature_version, r.finished_at::text
		FROM market.feature_runs r
		JOIN market.data_readiness d ON d.feature_run_id = r.id AND d.status = 'READY'
		WHERE r.feature_set = 'DAILY' AND r.status = 'SUCCEEDED'
		  AND EXISTS (
		      SELECT 1 FROM market.intraday_features_1m f 
		      WHERE f.ts::date = r.session_date 
		      LIMIT 1
		  )
		ORDER BY r.session_date DESC;
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("query sessions: %v", err))
		return
	}
	defer rows.Close()

	type Session struct {
		Date           string `json:"date"`
		FeatureRunID   string `json:"featureRunId"`
		FeatureVersion string `json:"featureVersion"`
		PublishedAt    string `json:"publishedAt"`
	}

	sessions := []*Session{}
	for rows.Next() {
		var item Session
		if err := rows.Scan(&item.Date, &item.FeatureRunID, &item.FeatureVersion, &item.PublishedAt); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		sessions = append(sessions, &item)
	}

	if s.redis != nil {
		exists, err := s.redis.Exists(ctx, "gidh:live:active").Result()
		if err == nil && exists > 0 {
			liveDate, err := s.redis.Get(ctx, "gidh:live:session_date").Result()
			if err == nil && liveDate != "" {
				hasDate := false
				for _, ses := range sessions {
					if ses.Date == liveDate {
						hasDate = true
						break
					}
				}
				if !hasDate {
					todaySession := &Session{
						Date:           liveDate,
						FeatureRunID:   "live-run",
						FeatureVersion: "LIVE",
						PublishedAt:    "LIVE_STREAMING",
					}
					sessions = append([]*Session{todaySession}, sessions...)
				}
			}
		}
	}

	writeJSON(w, http.StatusOK, sessions)
}

// Market Snapshot: GET /api/market/snapshot?date=YYYY-MM-DD&asOf=15:30:00
func (s *Server) HandleMarketSnapshot(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	sessionDate := r.URL.Query().Get("date")
	if sessionDate == "" {
		var latest string
		if err := s.db.Pool.QueryRow(ctx, "SELECT DISTINCT session_date FROM market.feature_runs ORDER BY session_date DESC LIMIT 1").Scan(&latest); err == nil && latest != "" {
			sessionDate = latest
		} else {
			sessionDate = "2026-08-25"
		}
	}

	asOf := r.URL.Query().Get("asOf")
	if asOf == "" {
		asOf = "15:30:00"
	}

	sql := `
		WITH latest_min AS (
			SELECT DISTINCT ON (c.instrument_id)
				i.symbol,
				COALESCE(i.sector, 'OTHERS') as sector,
				c.close as price,
				ROUND(((c.close - df.prior_close) / NULLIF(df.prior_close, 0) * 100)::numeric, 2) as move_pct,
				ROUND(((c.open - df.prior_close) / NULLIF(df.prior_close, 0) * 100)::numeric, 2) as gap_pct,
				ROUND(COALESCE(f.session_vwap, c.close)::numeric, 2) as vwap,
				ROUND(((c.close - COALESCE(f.session_vwap, c.close)) / NULLIF(COALESCE(f.session_vwap, c.close), 0) * 100)::numeric, 2) as vwap_dist_pct,
				ROUND(COALESCE(f.relative_volume, 1.0)::numeric, 2) as rvol,
				ROUND(COALESCE(f.clv, 0)::numeric, 2) as clv,
				c.volume as volume,
				(c.close >= COALESCE(f.session_vwap, c.close)) as is_above_vwap
			FROM market.cash_candles_1m c
			JOIN market.instruments i ON c.instrument_id = i.id
			LEFT JOIN market.intraday_features_1m f ON f.instrument_id = i.id AND f.ts = c.ts
			LEFT JOIN market.feature_runs fr ON fr.session_date = $1::date AND fr.feature_set = 'DAILY' AND fr.status = 'SUCCEEDED'
			LEFT JOIN market.daily_features df ON df.instrument_id = i.id AND df.feature_run_id = fr.id
			WHERE (c.ts AT TIME ZONE 'Asia/Kolkata')::date = $1::date
			  AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time <= $2::time
			ORDER BY c.instrument_id, c.ts DESC
		)
		SELECT 
			symbol,
			sector,
			price,
			move_pct,
			gap_pct,
			vwap,
			vwap_dist_pct,
			rvol,
			clv,
			volume,
			is_above_vwap
		FROM latest_min
		ORDER BY rvol DESC;
	`

	rows, err := s.db.Pool.Query(ctx, sql, sessionDate, asOf)
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("query snapshot: %v", err))
		return
	}
	defer rows.Close()

	type Stock struct {
		Symbol       string  `json:"symbol"`
		Sector       string  `json:"sector"`
		Price        float64 `json:"price"`
		MovePct      float64 `json:"move_pct"`
		GapPct       float64 `json:"gap_pct"`
		Vwap         float64 `json:"vwap"`
		VwapDistPct  float64 `json:"vwap_dist_pct"`
		Rvol         float64 `json:"rvol"`
		Clv          float64 `json:"clv"`
		Volume       float64 `json:"volume"`
		IsAboveVwap  bool    `json:"is_above_vwap"`
	}

	stocks := []*Stock{}
	aboveVwap := 0
	belowVwap := 0

	sectorStats := make(map[string]*struct {
		count      int
		sumMove    float64
		sumRvol    float64
		aboveCount int
	})

	for rows.Next() {
		var s Stock
		var price, movePct, gapPct, vwap, vwapDist, rvol, clv float64
		var vol int64
		var isAbove bool
		var sym, sec string

		if err := rows.Scan(
			&sym, &sec, &price, &movePct, &gapPct, &vwap, &vwapDist, &rvol, &clv, &vol, &isAbove,
		); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		resolvedSector := sec
		if resolvedSector == "" || resolvedSector == "N/A" || resolvedSector == "OTHERS" {
			fallback := sector.Resolve(sym)
			if fallback != "" && fallback != "OTHERS" {
				resolvedSector = fallback
			}
		}

		s.Symbol = sym
		s.Sector = resolvedSector
		s.Price = price
		s.MovePct = movePct
		s.GapPct = gapPct
		s.Vwap = vwap
		s.VwapDistPct = vwapDist
		s.Rvol = rvol
		s.Clv = clv
		s.Volume = float64(vol)
		s.IsAboveVwap = isAbove

		if isAbove {
			aboveVwap++
		} else {
			belowVwap++
		}
		stocks = append(stocks, &s)

		st := sectorStats[resolvedSector]
		if st == nil {
			st = &struct {
				count      int
				sumMove    float64
				sumRvol    float64
				aboveCount int
			}{}
			sectorStats[resolvedSector] = st
		}
		st.count++
		st.sumMove += movePct
		st.sumRvol += rvol
		if isAbove {
			st.aboveCount++
		}
	}

	total := len(stocks)
	pctAbove := 0.0
	if total > 0 {
		pctAbove = float64(aboveVwap) / float64(total) * 100
	}

	type SectorSummary struct {
		Sector       string  `json:"sector"`
		CivCount     int     `json:"civ_count"`
		AvgMovePct   float64 `json:"avg_move_pct"`
		AvgRvol      float64 `json:"avg_rvol"`
		PctAboveVwap float64 `json:"pct_above_vwap"`
	}

	sectorsList := []*SectorSummary{}
	for secName, st := range sectorStats {
		if st.count == 0 {
			continue
		}
		avgMove := st.sumMove / float64(st.count)
		avgRvol := st.sumRvol / float64(st.count)
		pctAbv := float64(st.aboveCount) / float64(st.count) * 100
		sectorsList = append(sectorsList, &SectorSummary{
			Sector:       secName,
			CivCount:     st.count,
			AvgMovePct:   avgMove,
			AvgRvol:      avgRvol,
			PctAboveVwap: pctAbv,
		})
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"session_date": sessionDate,
		"as_of_time":   asOf,
		"weather": map[string]interface{}{
			"total_civs":     total,
			"above_vwap":     aboveVwap,
			"below_vwap":     belowVwap,
			"pct_above_vwap": pctAbove,
		},
		"stocks":  stocks,
		"sectors": sectorsList,
		"traps":   []interface{}{},
	})
}

// Candles: GET /api/market/candles?symbol=XYZ&date=YYYY-MM-DD&interval=1m&toTime=15:30:00
func (s *Server) HandleCandles(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	symbol := r.URL.Query().Get("symbol")
	date := r.URL.Query().Get("date")
	interval := r.URL.Query().Get("interval")
	toTime := r.URL.Query().Get("toTime")

	if symbol == "" || date == "" {
		writeError(w, http.StatusBadRequest, "symbol and date query parameters are required")
		return
	}
	if interval == "" {
		interval = "1m"
	}
	if toTime == "" {
		toTime = "15:30:00"
	}

	type Candle struct {
		Time       int64    `json:"time"`
		Open       float64  `json:"open"`
		High       float64  `json:"high"`
		Low        float64  `json:"low"`
		Close      float64  `json:"close"`
		Volume     float64  `json:"volume"`
		Vwap       float64  `json:"vwap"`
		VwapUpper1 *float64 `json:"vwap_upper_1"`
		VwapLower1 *float64 `json:"vwap_lower_1"`
		VwapUpper2 *float64 `json:"vwap_upper_2"`
		VwapLower2 *float64 `json:"vwap_lower_2"`
		Rvol       *float64 `json:"rvol"`
		Pdh        *float64 `json:"pdh"`
		Pdl        *float64 `json:"pdl"`
	}

	if interval == "1m" {
		sql := `
			SELECT 
				EXTRACT(EPOCH FROM c.ts)::int as time,
				c.open,
				c.high,
				c.low,
				c.close,
				c.volume,
				COALESCE(f.session_vwap, c.close) as vwap,
				f.vwap_upper_1,
				f.vwap_lower_1,
				f.vwap_upper_2,
				f.vwap_lower_2,
				COALESCE(f.relative_volume, 1.0) as rvol,
				df.prior_high as pdh,
				df.prior_low as pdl
			FROM market.cash_candles_1m c
			JOIN market.instruments i ON c.instrument_id = i.id
			LEFT JOIN market.intraday_features_1m f ON f.instrument_id = i.id AND f.ts = c.ts
			LEFT JOIN market.feature_runs fr ON fr.session_date = (c.ts AT TIME ZONE 'Asia/Kolkata')::date AND fr.feature_set = 'DAILY' AND fr.status = 'SUCCEEDED'
			LEFT JOIN market.daily_features df ON df.instrument_id = i.id AND df.feature_run_id = fr.id
			WHERE i.symbol = $1 
			  AND (c.ts AT TIME ZONE 'Asia/Kolkata')::date = $2::date 
			  AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time >= '09:15:00'::time
			  AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time <= $3::time
			ORDER BY c.ts ASC;
		`
		rows, err := s.db.Pool.Query(ctx, sql, symbol, date, toTime)
		if err != nil {
			writeError(w, http.StatusInternalServerError, fmt.Sprintf("query candles: %v", err))
			return
		}
		defer rows.Close()

		candles := []*Candle{}
		for rows.Next() {
			var c Candle
			var t int64
			var open, high, low, close, vwap, rvol float64
			var vol int64
			var u1, l1, u2, l2, pdh, pdl *float64

			if err := rows.Scan(
				&t, &open, &high, &low, &close, &vol, &vwap, &u1, &l1, &u2, &l2, &rvol, &pdh, &pdl,
			); err != nil {
				writeError(w, http.StatusInternalServerError, err.Error())
				return
			}
			c.Time = t
			c.Open = open
			c.High = high
			c.Low = low
			c.Close = close
			c.Volume = float64(vol)
			c.Vwap = vwap
			c.VwapUpper1 = u1
			c.VwapLower1 = l1
			c.VwapUpper2 = u2
			c.VwapLower2 = l2
			c.Rvol = &rvol
			c.Pdh = pdh
			c.Pdl = pdl

			candles = append(candles, &c)
		}
		writeJSON(w, http.StatusOK, candles)
		return
	}

	// Multi-interval aggregation with time_bucket
	var bucketInterval string
	switch interval {
	case "3m":
		bucketInterval = "3 minutes"
	case "5m":
		bucketInterval = "5 minutes"
	case "15m":
		bucketInterval = "15 minutes"
	case "30m":
		bucketInterval = "30 minutes"
	case "1h", "60m":
		bucketInterval = "1 hour"
	case "1d", "D":
		bucketInterval = "1 day"
	default:
		bucketInterval = "5 minutes"
	}

	sql := `
		SELECT 
			EXTRACT(EPOCH FROM time_bucket($1::interval, c.ts))::int as time,
			(array_agg(c.open ORDER BY c.ts ASC))[1] as open,
			MAX(c.high) as high,
			MIN(c.low) as low,
			(array_agg(c.close ORDER BY c.ts DESC))[1] as close,
			SUM(c.volume) as volume,
			(array_agg(COALESCE(f.session_vwap, c.close) ORDER BY c.ts DESC))[1] as vwap,
			(array_agg(f.vwap_upper_1 ORDER BY c.ts DESC))[1] as vwap_upper_1,
			(array_agg(f.vwap_lower_1 ORDER BY c.ts DESC))[1] as vwap_lower_1,
			(array_agg(f.vwap_upper_2 ORDER BY c.ts DESC))[1] as vwap_upper_2,
			(array_agg(f.vwap_lower_2 ORDER BY c.ts DESC))[1] as vwap_lower_2,
			(array_agg(COALESCE(f.relative_volume, 1.0) ORDER BY c.ts DESC))[1] as rvol,
			MAX(df.prior_high) as pdh,
			MIN(df.prior_low) as pdl
		FROM market.cash_candles_1m c
		JOIN market.instruments i ON c.instrument_id = i.id
		LEFT JOIN market.intraday_features_1m f ON f.instrument_id = i.id AND f.ts = c.ts
		LEFT JOIN market.feature_runs fr ON fr.session_date = (c.ts AT TIME ZONE 'Asia/Kolkata')::date AND fr.feature_set = 'DAILY' AND fr.status = 'SUCCEEDED'
		LEFT JOIN market.daily_features df ON df.instrument_id = i.id AND df.feature_run_id = fr.id
		WHERE i.symbol = $2 
		  AND (c.ts AT TIME ZONE 'Asia/Kolkata')::date = $3::date
		  AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time >= '09:15:00'::time
		  AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time < '15:30:00'::time
		GROUP BY 1
		ORDER BY 1 ASC;
	`
	rows, err := s.db.Pool.Query(ctx, sql, bucketInterval, symbol, date)
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("query multi-interval candles: %v", err))
		return
	}
	defer rows.Close()

	candles := []*Candle{}
	for rows.Next() {
		var c Candle
		var t int64
		var open, high, low, close, vwap, rvol float64
		var vol int64
		var u1, l1, u2, l2, pdh, pdl *float64

		if err := rows.Scan(
			&t, &open, &high, &low, &close, &vol, &vwap, &u1, &l1, &u2, &l2, &rvol, &pdh, &pdl,
		); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		c.Time = t
		c.Open = open
		c.High = high
		c.Low = low
		c.Close = close
		c.Volume = float64(vol)
		c.Vwap = vwap
		c.VwapUpper1 = u1
		c.VwapLower1 = l1
		c.VwapUpper2 = u2
		c.VwapLower2 = l2
		c.Rvol = &rvol
		c.Pdh = pdh
		c.Pdl = pdl

		candles = append(candles, &c)
	}
	writeJSON(w, http.StatusOK, candles)
}

// Live Positions: GET /api/trading/positions
func (s *Server) HandleLivePositions(w http.ResponseWriter, r *http.Request) {
	if s.orders == nil {
		writeJSON(w, http.StatusOK, []interface{}{})
		return
	}
	positions, err := s.orders.ListPositions(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, positions)
}

// Closed Positions: GET /api/trading/closed-positions?date=YYYY-MM-DD
func (s *Server) HandleClosedPositions(w http.ResponseWriter, r *http.Request) {
	if s.orders == nil {
		writeJSON(w, http.StatusOK, []interface{}{})
		return
	}
	date := r.URL.Query().Get("date")
	closed, err := s.orders.ListClosedPositions(r.Context(), date)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, closed)
}

// Managed Orders: GET /api/trading/orders
func (s *Server) HandleManagedOrders(w http.ResponseWriter, r *http.Request) {
	if s.orders == nil {
		writeJSON(w, http.StatusOK, []interface{}{})
		return
	}
	orders, err := s.orders.ListOrders(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, orders)
}

// Place Order: POST /api/trading/orders
func (s *Server) HandlePlaceOrder(w http.ResponseWriter, r *http.Request) {
	if s.orders == nil {
		writeError(w, http.StatusServiceUnavailable, "order manager is unavailable")
		return
	}
	var req struct {
		ClientOrderID    string  `json:"client_order_id"`
		Symbol           string  `json:"symbol"`
		Side             string  `json:"side"`
		OrderType        string  `json:"order_type"`
		TargetEntryPrice float64 `json:"target_entry_price"`
		MarginINR        float64 `json:"margin_inr"`
		Tactic           string  `json:"tactic"`
		Invalidation     string  `json:"invalidation"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.MarginINR <= 0 {
		req.MarginINR = 10000
	}
	if req.Invalidation == "" {
		req.Invalidation = "15M_VWAP_CROSS"
	}

	userEmail := edgeauth.UserEmail(r.Context())
	if userEmail == "" {
		userEmail = "anonymous@gidh.tech"
	}

	if strings.EqualFold(req.OrderType, "LIMIT") {
		if req.TargetEntryPrice <= 0 {
			writeError(w, http.StatusBadRequest, "a positive limit price is required for limit orders")
			return
		}
		order, err := s.orders.PlaceLimitOrder(r.Context(), ordermanager.PlaceLimitInput{
			PlaceMarketInput: ordermanager.PlaceMarketInput{
				ClientOrderID: req.ClientOrderID,
				Symbol:        req.Symbol,
				Side:          ordermanager.TradeSide(req.Side),
				MarginINR:     req.MarginINR,
				Tactic:        req.Tactic,
				Invalidation:  req.Invalidation,
				InitiatedBy:   userEmail,
			},
			LimitPrice: req.TargetEntryPrice,
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, order)
		return
	}

	order, err := s.orders.PlaceMarketOrder(r.Context(), ordermanager.PlaceMarketInput{
		ClientOrderID: req.ClientOrderID,
		Symbol:        req.Symbol,
		Side:          ordermanager.TradeSide(req.Side),
		MarginINR:     req.MarginINR,
		Tactic:        req.Tactic,
		Invalidation:  req.Invalidation,
		InitiatedBy:   userEmail,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, order)
}

// Square Off Position: POST /api/trading/positions/:symbol/square-off
func (s *Server) HandleSquareOff(w http.ResponseWriter, r *http.Request) {
	if s.orders == nil {
		writeError(w, http.StatusServiceUnavailable, "order manager is unavailable")
		return
	}
	// Extract symbol from path: /api/trading/positions/{symbol}/square-off
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 4 {
		writeError(w, http.StatusBadRequest, "invalid square off URL path")
		return
	}
	symbol := parts[3]

	var body struct {
		Reason string `json:"reason"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if body.Reason == "" {
		body.Reason = "MANUAL_SQUARE_OFF"
	}

	userEmail := edgeauth.UserEmail(r.Context())
	order, err := s.orders.SquareOffPosition(r.Context(), symbol, body.Reason, userEmail)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, order)
}

// Update Position Levels: POST /api/trading/positions/:symbol/levels
func (s *Server) HandleUpdateLevels(w http.ResponseWriter, r *http.Request) {
	if s.orders == nil {
		writeError(w, http.StatusServiceUnavailable, "order manager is unavailable")
		return
	}
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 4 {
		writeError(w, http.StatusBadRequest, "invalid levels URL path")
		return
	}
	symbol := parts[3]

	var body struct {
		StopLossPrice *float64 `json:"stop_loss_price"`
		TargetPrice   *float64 `json:"target_price"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json body")
		return
	}

	pos, err := s.orders.UpdatePositionLevels(r.Context(), symbol, body.StopLossPrice, body.TargetPrice)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, pos)
}

// Cancel Limit Order: DELETE /api/trading/orders/:id
func (s *Server) HandleCancelOrder(w http.ResponseWriter, r *http.Request) {
	if s.orders == nil {
		writeError(w, http.StatusServiceUnavailable, "order manager is unavailable")
		return
	}
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 4 {
		writeError(w, http.StatusBadRequest, "order id required")
		return
	}
	id := parts[3]

	order, err := s.orders.CancelLimitOrder(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, order)
}

// Risk State: GET /api/trading/risk-state
func (s *Server) HandleRiskState(w http.ResponseWriter, r *http.Request) {
	if s.orders == nil {
		writeJSON(w, http.StatusOK, map[string]interface{}{"kill_switch": false, "circuit_broken": false})
		return
	}
	st, err := s.orders.RiskState(r.Context())
	if err != nil || st == nil {
		writeJSON(w, http.StatusOK, map[string]interface{}{"kill_switch": false, "circuit_broken": false})
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"kill_switch":    st.KillSwitch,
		"circuit_broken": st.CircuitBroken,
		"reason":         st.Reason,
	})
}

// Reset Tripwire: POST /api/trading/risk-state/reset
func (s *Server) HandleResetTripwire(w http.ResponseWriter, r *http.Request) {
	if s.orders == nil {
		writeError(w, http.StatusServiceUnavailable, "order manager unavailable")
		return
	}
	if err := s.orders.ResetTripwire(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"success": true})
}

// Brain Sessions: GET /api/macro/brain-sessions
func (s *Server) HandleBrainSessions(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	brainID := r.URL.Query().Get("brainId")
	limitStr := r.URL.Query().Get("limit")
	limit := 20
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
		limit = l
	}

	sql := `
		SELECT session_date::text, brain_id, ai_thesis, decisions::text, 
		       sensory_features::text, outcomes::text, forensics, created_at::text
		FROM quant.brain_sessions
		WHERE 1=1
	`
	args := []interface{}{}
	argIdx := 1
	if brainID != "" {
		sql += fmt.Sprintf(" AND brain_id = $%d", argIdx)
		args = append(args, brainID)
		argIdx++
	}
	sql += fmt.Sprintf(" ORDER BY session_date DESC, created_at DESC LIMIT $%d", argIdx)
	args = append(args, limit)

	rows, err := s.db.Pool.Query(ctx, sql, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	type SessionRecord struct {
		SessionDate         string  `json:"session_date"`
		BrainID             string  `json:"brain_id"`
		AiThesis            string  `json:"ai_thesis"`
		DecisionsJSON       string  `json:"decisions_json"`
		SensoryFeaturesJSON *string `json:"sensory_features_json"`
		OutcomesJSON        *string `json:"outcomes_json"`
		Forensics           *string `json:"forensics"`
		CreatedAt           string  `json:"created_at"`
	}

	records := []*SessionRecord{}
	for rows.Next() {
		var r SessionRecord
		if err := rows.Scan(&r.SessionDate, &r.BrainID, &r.AiThesis, &r.DecisionsJSON, &r.SensoryFeaturesJSON, &r.OutcomesJSON, &r.Forensics, &r.CreatedAt); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		records = append(records, &r)
	}
	writeJSON(w, http.StatusOK, records)
}
