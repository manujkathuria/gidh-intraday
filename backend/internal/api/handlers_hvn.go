package api

import (
	"context"
	"math"
	"net/http"
	"sort"
	"time"
)

// HVNNode represents a dense price volume cluster.
type HVNNode struct {
	PriceLevel   float64 `json:"price_level"`
	Volume       int64   `json:"volume"`
	VolumePct    float64 `json:"volume_pct"`
	IsTopDefense bool    `json:"is_top_defense"`
}

// HVNResponse returns top High Volume Nodes and Profile Bins for a chart symbol.
type HVNResponse struct {
	Symbol      string    `json:"symbol"`
	SessionDate string    `json:"session_date"`
	TotalVolume int64     `json:"total_volume"`
	HVNs        []HVNNode `json:"hvns"`
}

// HandleChartHVN computes discrete High Volume Nodes for a given symbol and session.
func (s *Server) HandleChartHVN(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	symbol := q.Get("symbol")
	if symbol == "" {
		writeError(w, http.StatusBadRequest, "symbol is required")
		return
	}
	sessionDate := q.Get("date")
	if sessionDate == "" {
		sessionDate = time.Now().Format("2006-01-02")
	}

	ctx := r.Context()
	nodes, totalVol, err := s.calcHVN(ctx, symbol, sessionDate)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, HVNResponse{
		Symbol:      symbol,
		SessionDate: sessionDate,
		TotalVolume: totalVol,
		HVNs:        nodes,
	})
}

func (s *Server) calcHVN(ctx context.Context, symbol, sessionDate string) ([]HVNNode, int64, error) {
	query := `
		SELECT c.close, c.volume
		FROM market.cash_candles_1m c
		JOIN market.instruments i ON c.instrument_id = i.id
		WHERE (c.ts AT TIME ZONE 'Asia/Kolkata')::date = $1
		  AND i.symbol = $2
		ORDER BY c.ts ASC;
	`
	rows, err := s.db.Pool.Query(ctx, query, sessionDate, symbol)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	priceVol := make(map[float64]int64)
	var totalVol int64

	for rows.Next() {
		var closePrice float64
		var vol int64
		if err := rows.Scan(&closePrice, &vol); err != nil {
			continue
		}
		bin := math.Round(closePrice*2) / 2 // 0.50 tick binning
		priceVol[bin] += vol
		totalVol += vol
	}

	if totalVol == 0 {
		return []HVNNode{}, 0, nil
	}

	var allNodes []HVNNode
	for price, vol := range priceVol {
		pct := float64(vol) / float64(totalVol) * 100
		allNodes = append(allNodes, HVNNode{
			PriceLevel: price,
			Volume:     vol,
			VolumePct:  math.Round(pct*100) / 100,
		})
	}

	sort.Slice(allNodes, func(i, j int) bool {
		return allNodes[i].Volume > allNodes[j].Volume
	})

	limit := 5
	if len(allNodes) < limit {
		limit = len(allNodes)
	}

	topHVNs := allNodes[:limit]
	for i := range topHVNs {
		if i == 0 {
			topHVNs[i].IsTopDefense = true
		}
	}

	return topHVNs, totalVol, nil
}
