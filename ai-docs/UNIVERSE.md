# Trade Universe

## Purpose

The approved universe is the liquid NSE single-stock F&O set maintained in the database. The target capacity is approximately 210 names. It is a dynamic eligibility set, not a static 30-stock watchlist.

The universe exists to find institutional-quality opportunity without expanding into illiquid or easily manipulated names. A symbol is eligible only if all checks below pass for the current session.

## Eligibility contract

| Requirement | Owner | Consequence if missing |
| --- | --- | --- |
| Cash equity token and current symbol mapping | `instruments` | Exclude symbol |
| Active, near-month NFO futures contract | `instruments` | Exclude symbol |
| Valid future expiry and lot size | `instruments` | Exclude symbol |
| Structural metadata | `instruments_metadata` | Observe only; do not rank for trade |
| Current pre-market feature row | `instrument_stats` | Exclude from pre-market selection |
| Fresh cash and futures market data | ingestion/streaming | Suspend actionable decisions |

**No active future means no trade.** Cash price alone can be observed, but it is not sufficient for an actionable intraday thesis because the system cannot verify derivatives participation or execute the approved instrument reliably.

## Dual-token model

Each eligible symbol has a stable cash spine and a rotating futures satellite:

- `cash_token`: continuous cash-equity history used for price action, daily range, and session VWAP.
- `future_token`: the active near-month NFO future used for futures close, open interest, basis, and futures execution.
- `future_expiry`: validates that the satellite is current.
- `lot_size`: the minimum futures execution unit. Position construction must respect it exactly.

The futures token may change at expiry; the historical cash series must not be rewritten because of that rotation.

## Segmentation

`instruments_metadata` supplies `sector`, `industry`, `cap_tier`, and `nifty_50_constituent`. These describe exposures and help prevent accidental concentration; they are not a substitute for measuring relative strength or liquidity.

The sector classifier currently uses more granular groups such as `DEFENCE_AERO`, `IT_TECH`, `PRIVATE_BANKS`, and `POWER_GREEN`. Agents must read the stored value rather than assume a fixed sector vocabulary from documentation.

## Pre-market feature vector

The deterministic feature spine in `instrument_stats` supplies, where available:

- Momentum and relative position: `ret_20d_pct`, `ret_5d_pct`, `dist_20dh_pct`, `dist_20dl_pct`.
- Compression and capacity: `vcp_3d_ratio`, `atr_pct`, `vol_dryup_ratio`.
- Futures participation: `fut_oi_5d_delta_pct` and OI build-up classification.
- Pre-open and ranking context: gap, pre-open volume ratio, delivery percentage, and sector relative-strength rank.

Features are inputs to a ranking policy. A high score is not an order instruction.

## Funnel

```text
Eligible F&O universe
  → deterministic freshness and liquidity gate
  → deterministic feature snapshot
  → ranked candidates with sector/exposure limits
  → small focus list for live monitoring
  → evidence-backed intraday decision
```

The focus list is intentionally small so live attention is a scarce resource. It may include long, short, or observe-only candidates. It is refreshed when data changes materially, not because a scheduled LLM call must produce an answer.
