package api

import (
	"fmt"
	"net/http"
)

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
