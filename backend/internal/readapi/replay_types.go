package readapi

type ReplayStock struct {
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

type ReplaySector struct {
	Sector       string  `json:"sector"`
	CivCount     int     `json:"civ_count"`
	AvgMovePct   float64 `json:"avg_move_pct"`
	AvgRVOL      float64 `json:"avg_rvol"`
	PctAboveVWAP float64 `json:"pct_above_vwap"`
}

type ReplayTrap struct {
	Symbol      string  `json:"symbol"`
	Sector      string  `json:"sector"`
	TrapType    string  `json:"trap_type"`
	Confidence  string  `json:"confidence"`
	Description string  `json:"description"`
	MovePct     float64 `json:"move_pct"`
	GapPct      float64 `json:"gap_pct"`
	RVOL        float64 `json:"rvol"`
	CLV         float64 `json:"clv"`
}

type ReplayWeather struct {
	TotalCivs    int     `json:"total_civs"`
	AboveVWAP    int     `json:"above_vwap"`
	BelowVWAP    int     `json:"below_vwap"`
	PctAboveVWAP float64 `json:"pct_above_vwap"`
}

type ReplaySnapshotResponse struct {
	SessionDate string         `json:"session_date"`
	AsOfTime    string         `json:"as_of_time"`
	Weather     ReplayWeather  `json:"weather"`
	Stocks      []ReplayStock  `json:"stocks"`
	Sectors     []ReplaySector `json:"sectors"`
	Traps       []ReplayTrap   `json:"traps"`
}

type ReplayCandle struct {
	Time       int64   `json:"time"`
	Open       float64 `json:"open"`
	High       float64 `json:"high"`
	Low        float64 `json:"low"`
	Close      float64 `json:"close"`
	Volume     int64   `json:"volume"`
	VWAP       float64 `json:"vwap"`
	VWAPUpper1 float64 `json:"vwap_upper_1,omitempty"`
	VWAPLower1 float64 `json:"vwap_lower_1,omitempty"`
	VWAPUpper2 float64 `json:"vwap_upper_2,omitempty"`
	VWAPLower2 float64 `json:"vwap_lower_2,omitempty"`
	RVOL       float64 `json:"rvol,omitempty"`
}


