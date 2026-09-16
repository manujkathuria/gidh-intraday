package readapi

import (
	"context"
	"fmt"
)

func (r *Repository) DailyFocus(ctx context.Context, sessionDate string) ([]DailyFocusItem, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT l.id::text, l.session_date::text, l.feature_run_id::text, run.policy_version, l.published_at,
			i.symbol, item.rank, item.state, item.attention_score
		FROM ai.daily_focus_lists l
		JOIN ai.research_runs run ON run.id = l.research_run_id AND run.status = 'SUCCEEDED'
		JOIN ai.daily_focus_list_items item ON item.focus_list_id = l.id
		JOIN market.instruments i ON i.id = item.instrument_id
		WHERE l.session_date = $1::date AND l.status = 'PUBLISHED'
		ORDER BY l.published_at DESC, item.rank ASC;
	`, sessionDate)
	if err != nil {
		return []DailyFocusItem{}, nil
	}
	defer rows.Close()
	items := []DailyFocusItem{}
	for rows.Next() {
		var item DailyFocusItem
		if err := rows.Scan(&item.FocusListID, &item.SessionDate, &item.FeatureRunID, &item.PolicyVersion, &item.PublishedAt, &item.Symbol, &item.Rank, &item.State, &item.AttentionScore); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) QuantBrainRules(ctx context.Context) ([]BrainRuleItem, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT rule_id, category, name, confidence, condition_json, action, COALESCE(invalidation, ''), evidence
		FROM quant.brain_rules
		WHERE status = 'ACTIVE'
		ORDER BY confidence DESC;
	`)
	if err != nil {
		return []BrainRuleItem{}, nil
	}
	defer rows.Close()

	var rules []BrainRuleItem
	for rows.Next() {
		var item BrainRuleItem
		var condMap map[string]interface{}
		var invalidation, evidence string
		if err := rows.Scan(&item.ID, &item.Category, &item.Name, &item.Confidence, &condMap, &item.Action, &invalidation, &evidence); err != nil {
			return []BrainRuleItem{}, nil
		}
		item.Invalidation = invalidation
		item.Notes = evidence

		var conditions []string
		if chk, ok := condMap["checkpoint"].(string); ok && chk != "" {
			item.TriggerTime = chk
		}
		for k, v := range condMap {
			if k == "checkpoint" {
				continue
			}
			conditions = append(conditions, fmt.Sprintf("%s: %v", k, v))
		}
		item.Conditions = conditions
		rules = append(rules, item)
	}
	return rules, nil
}

func (r *Repository) QuantOperatingSchedule(ctx context.Context) ([]OperatingScheduleItem, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, checkpoint_time, time_window, sequence_order, phase_name, trigger_event, required_action, risk_constraint, status
		FROM quant.operating_schedule
		ORDER BY sequence_order ASC;
	`)
	if err != nil {
		return []OperatingScheduleItem{}, nil
	}
	defer rows.Close()

	var schedule []OperatingScheduleItem
	for rows.Next() {
		var item OperatingScheduleItem
		if err := rows.Scan(&item.ID, &item.CheckpointTime, &item.TimeWindow, &item.SequenceOrder, &item.PhaseName, &item.TriggerEvent, &item.RequiredAction, &item.RiskConstraint, &item.Status); err != nil {
			return []OperatingScheduleItem{}, nil
		}
		schedule = append(schedule, item)
	}
	return schedule, nil
}
