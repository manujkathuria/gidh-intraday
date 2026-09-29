package api

import (
	"net/http"
)

type StockStatRecord struct {
	Symbol    string  `json:"symbol"`
	Name      string  `json:"name"`
	Close     float64 `json:"close"`
	Open      float64 `json:"open"`
	High      float64 `json:"high"`
	Low       float64 `json:"low"`
	PrevClose float64 `json:"prev_close"`
	ChangePct float64 `json:"change_pct"`
}

type IndexItem struct {
	Symbol     string  `json:"symbol"`
	Name       string  `json:"name"`
	Category   string  `json:"category"` // "BENCHMARK", "GLOBAL_CUE", "VOLATILITY", "SECTOR"
	SpotPrice  float64 `json:"spot_price"`
	PrevClose  float64 `json:"prev_close"`
	ChangePts  float64 `json:"change_pts"`
	ChangePct  float64 `json:"change_pct"`
	High       float64 `json:"high"`
	Low        float64 `json:"low"`
	Vwap       float64 `json:"vwap"`
	Advances   int     `json:"advances"`
	Declines   int     `json:"declines"`
	TopGainer  string  `json:"top_gainer,omitempty"`
	TopLoser   string  `json:"top_loser,omitempty"`
}

type HeavyweightImpact struct {
	Symbol      string  `json:"symbol"`
	Name        string  `json:"name"`
	WeightPct   float64 `json:"weight_pct"`
	Price       float64 `json:"price"`
	ChangePct   float64 `json:"change_pct"`
	PointImpact float64 `json:"point_impact"`
}

type GiftNiftyInfo struct {
	Price          float64 `json:"price"`
	NiftyPrevClose float64 `json:"nifty_prev_close"`
	GapPts         float64 `json:"gap_pts"`
	GapPct         float64 `json:"gap_pct"`
	Sentiment      string  `json:"sentiment"`
}

type VixInfo struct {
	Value     float64 `json:"value"`
	ChangePct float64 `json:"change_pct"`
	Regime    string  `json:"regime"`
}

type IndicesDashboardResponse struct {
	SessionDate    string               `json:"session_date"`
	AvailableDates []string             `json:"available_dates"`
	GiftNifty      GiftNiftyInfo        `json:"gift_nifty"`
	IndiaVix       VixInfo              `json:"india_vix"`
	Benchmarks     []*IndexItem         `json:"benchmarks"`
	SectorIndices  []*IndexItem         `json:"sector_indices"`
	Indices        []*IndexItem         `json:"indices"`
	Heavyweights   []*HeavyweightImpact `json:"heavyweights"`
}

// GET /api/market/indices?date=YYYY-MM-DD
func (s *Server) HandleIndicesDashboard(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	targetDate := r.URL.Query().Get("date")

	sessionDate := targetDate
	if sessionDate == "" {
		_ = s.db.Pool.QueryRow(ctx, `SELECT session_date::text FROM market.feature_runs WHERE status = 'SUCCEEDED' ORDER BY session_date DESC LIMIT 1`).Scan(&sessionDate)
	}
	if sessionDate == "" {
		sessionDate = "2026-09-29"
	}

	datesRows, _ := s.db.Pool.Query(ctx, `SELECT DISTINCT session_date::text FROM market.feature_runs WHERE status = 'SUCCEEDED' ORDER BY session_date DESC LIMIT 30`)
	availableDates := []string{}
	if datesRows != nil {
		defer datesRows.Close()
		for datesRows.Next() {
			var d string
			if err := datesRows.Scan(&d); err == nil {
				availableDates = append(availableDates, d)
			}
		}
	}

	benchmarks, heavyweights, sectorIndices, giftNifty, vix := s.calculateIndicesMetrics(ctx, sessionDate)

	allIndices := make([]*IndexItem, 0, len(benchmarks)+len(sectorIndices)+2)
	// Add Global Cue
	allIndices = append(allIndices, &IndexItem{
		Symbol: "GIFT NIFTY", Name: "GIFT Nifty Overnight / Pre-Market",
		Category: "GLOBAL_CUE", SpotPrice: giftNifty.Price, PrevClose: giftNifty.NiftyPrevClose,
		ChangePts: giftNifty.GapPts, ChangePct: giftNifty.GapPct,
		High: giftNifty.Price, Low: giftNifty.Price, Vwap: giftNifty.Price,
		Advances: 0, Declines: 0,
	})
	// Add VIX
	allIndices = append(allIndices, &IndexItem{
		Symbol: "INDIA VIX", Name: "India Volatility Index",
		Category: "VOLATILITY", SpotPrice: vix.Value, PrevClose: vix.Value / (1 + (vix.ChangePct / 100)),
		ChangePts: vix.Value - (vix.Value / (1 + (vix.ChangePct / 100))), ChangePct: vix.ChangePct,
		High: vix.Value + 0.3, Low: vix.Value - 0.3, Vwap: vix.Value,
		Advances: 0, Declines: 0,
	})
	// Add Benchmarks & Sectors
	allIndices = append(allIndices, benchmarks...)
	allIndices = append(allIndices, sectorIndices...)

	writeJSON(w, http.StatusOK, &IndicesDashboardResponse{
		SessionDate:    sessionDate,
		AvailableDates: availableDates,
		GiftNifty:      giftNifty,
		IndiaVix:       vix,
		Benchmarks:     benchmarks,
		SectorIndices:  sectorIndices,
		Indices:        allIndices,
		Heavyweights:   heavyweights,
	})
}
