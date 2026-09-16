package marketdata

type LiveStock struct {
	Symbol      string  `json:"symbol"`
	Sector      string  `json:"sector"`
	Price       float64 `json:"price"`
	GapPct      float64 `json:"gap_pct"`
	MovePct     float64 `json:"move_pct"`
	VWAP        float64 `json:"vwap"`
	VWAPDistPct float64 `json:"vwap_dist_pct"`
	RVOL        float64 `json:"rvol"`
	CLV         float64 `json:"clv"`
	Volume      int64   `json:"volume"`
	IsAboveVWAP bool    `json:"is_above_vwap"`
}

type LiveSector struct {
	Sector       string  `json:"sector"`
	CivCount     int     `json:"civ_count"`
	AvgMovePct   float64 `json:"avg_move_pct"`
	AvgRVOL      float64 `json:"avg_rvol"`
	PctAboveVWAP float64 `json:"pct_above_vwap"`
}

type LiveWeather struct {
	TotalCivs    int     `json:"total_civs"`
	AboveVWAP    int     `json:"above_vwap"`
	BelowVWAP    int     `json:"below_vwap"`
	PctAboveVWAP float64 `json:"pct_above_vwap"`
}

type LiveSnapshot struct {
	SessionDate string       `json:"session_date"`
	AsOfTime    string       `json:"as_of_time"`
	Weather     LiveWeather  `json:"weather"`
	Stocks      []LiveStock  `json:"stocks"`
	Sectors     []LiveSector `json:"sectors"`
	Traps       []any        `json:"traps"`
}

type LiveCandle struct {
	Time   int64   `json:"time"`
	Open   float64 `json:"open"`
	High   float64 `json:"high"`
	Low    float64 `json:"low"`
	Close  float64 `json:"close"`
	Volume int64   `json:"volume"`
	VWAP   float64 `json:"vwap"`
}
