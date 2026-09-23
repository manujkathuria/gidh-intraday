package api

import (
	"fmt"
	"net/http"
	"strconv"
)

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
