package store

import "context"

// BuildIntraday replays raw completed one-minute bars into neutral market-state
// facts. It reads the preceding 40 calendar days only to form the 20-session
// minute-of-day volume profile; it writes rows exclusively for [from, to].
func (r *DailyFeatureRepo) BuildIntraday(ctx context.Context, from, to string) (int64, error) {
	tag, err := r.db.Pool.Exec(ctx, buildIntradayFeaturesSQL, from, to)
	return tag.RowsAffected(), err
}
