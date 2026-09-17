import pandas as pd
import numpy as np

def analyze_trade_forensics(results_df: pd.DataFrame) -> dict:
    """
    Analyzes winning vs losing trades to extract evolutionary patterns:
    - Optimal entry time windows
    - Fuel threshold efficiency
    - MFE vs realized PnL capture efficiency
    """
    if results_df.empty:
        return {}

    executed = results_df[results_df['status'] == 'CONFIRMED']
    if executed.empty:
        return {"executed_trades": 0}

    winners = executed[executed['net_pnl_₹'] > 0]
    losers = executed[executed['net_pnl_₹'] <= 0]

    win_rate = (len(winners) / len(executed)) * 100
    total_net_pnl = executed['net_pnl_₹'].sum()
    avg_win = winners['net_pnl_₹'].mean() if not winners.empty else 0.0
    avg_loss = losers['net_pnl_₹'].mean() if not losers.empty else 0.0
    profit_factor = abs(winners['net_pnl_₹'].sum() / losers['net_pnl_₹'].sum()) if (not losers.empty and losers['net_pnl_₹'].sum() != 0) else float('inf')

    # Fuel correlation
    avg_winner_fuel = winners['fuel_entry_%'].mean() if not winners.empty else 0.0
    avg_loser_fuel = losers['fuel_entry_%'].mean() if not losers.empty else 0.0

    return {
        "executed_trades": len(executed),
        "win_rate_pct": round(win_rate, 2),
        "total_net_pnl_₹": round(total_net_pnl, 2),
        "avg_win_₹": round(avg_win, 2),
        "avg_loss_₹": round(avg_loss, 2),
        "profit_factor": round(profit_factor, 2),
        "avg_winner_fuel_%": round(avg_winner_fuel, 1),
        "avg_loser_fuel_%": round(avg_loser_fuel, 1),
    }
