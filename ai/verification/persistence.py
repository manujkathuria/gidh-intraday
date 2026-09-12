"""
PostgreSQL Session Persistence Engine (ai.selection_sessions / ai.selection_picks)
"""

import json
from typing import Dict, List
from ai.core.db import get_db_connection

def persist_session_audit(session_date: str, picks_summary: Dict, notes: str):
    """Persists aggregated session score and post-mortem notes to ai.selection_sessions."""
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
    INSERT INTO ai.selection_sessions (
        session_date, total_picks, hits, misses, hit_rate_pct, avg_pick_return_pct,
        top_universe_gainers, selection_playbook, post_mortem_notes
    ) VALUES (
        %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s
    ) ON CONFLICT (session_date) DO UPDATE SET 
        total_picks = EXCLUDED.total_picks,
        hits = EXCLUDED.hits,
        misses = EXCLUDED.misses,
        hit_rate_pct = EXCLUDED.hit_rate_pct,
        avg_pick_return_pct = EXCLUDED.avg_pick_return_pct,
        top_universe_gainers = EXCLUDED.top_universe_gainers,
        post_mortem_notes = EXCLUDED.post_mortem_notes;
    """, (
        session_date,
        picks_summary.get('total_picks', 0),
        picks_summary.get('hits', 0),
        picks_summary.get('misses', 0),
        picks_summary.get('hit_rate_pct', 0.0),
        picks_summary.get('avg_pick_return_pct', 0.0),
        json.dumps(picks_summary.get('top_gainers', [])),
        json.dumps(picks_summary.get('playbook', {})),
        notes
    ))
    conn.commit()
    conn.close()

def persist_individual_picks(picks: List[Dict]):
    """Persists individual stock picks with MFE/MAE to ai.selection_picks."""
    if not picks:
        return
    conn = get_db_connection()
    cur = conn.cursor()

    for p in picks:
        cur.execute("""
        INSERT INTO ai.selection_picks (
            session_date, symbol, direction, selection_time, selection_price,
            day_close_price, day_return_pct, max_favorable_move_pct, max_adverse_move_pct,
            is_hit, selection_hypothesis
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        ) ON CONFLICT (session_date, symbol) DO UPDATE SET 
            day_close_price = EXCLUDED.day_close_price,
            day_return_pct = EXCLUDED.day_return_pct,
            max_favorable_move_pct = EXCLUDED.max_favorable_move_pct,
            is_hit = EXCLUDED.is_hit;
        """, (
            p['session_date'], p['symbol'], p['direction'], p.get('selection_time', '09:30:00'),
            p['selection_price'], p.get('day_close_price', p['selection_price']),
            p.get('day_return_pct', 0.0), p.get('max_mfe_pct', 0.0), p.get('max_mae_pct', 0.0),
            p.get('is_hit', False), p.get('hypothesis', '')
        ))
    conn.commit()
    conn.close()
