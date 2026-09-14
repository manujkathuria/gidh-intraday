# Gidh Trade Universe

## 1. Purpose

The approved Gidh universe is the liquid **NSE single-stock F&O universe** maintained in the database (`market.instruments`). The active universe consists of **210 liquid instruments**. It is a dynamic eligibility set, not a static 30-stock watchlist.

The universe exists to capture institutional-quality opportunity without expanding into illiquid or easily manipulated names. A symbol is eligible only if all checks pass for the current session.

---

## 2. Eligibility & Architecture Contract

| Requirement | Owner Table | Consequence if Missing |
| :--- | :--- | :--- |
| Cash equity token & current symbol mapping | `market.instruments` (`segment = 'EQ'`) | Exclude symbol |
| Active, near-month NFO futures contract | `market.future_contracts` | Exclude symbol |
| Valid future expiry and lot size | `market.instruments` & `market.future_contracts` | Exclude symbol |
| Daily baseline features row | `market.daily_features` | Exclude from pre-market selection |
| Fresh 1-minute cash & futures stream | `market.intraday_features_1m` | Suspend actionable decisions |

**No active derivative participation means no trade.** Cash price alone can be observed, but it is not sufficient for an actionable intraday thesis because the system cannot verify institutional derivatives participation (OI shifts, basis, futures volume).

---

## 3. Dual-Token Architecture

Each eligible symbol has a stable cash spine and a rotating futures satellite:

- **`cash_token` / `instrument_id`**: Continuous cash-equity history used for price action, daily range, opening range (15m/30m), and session VWAP.
- **`future_contract_id`**: The active near-month NFO future used for futures close, open interest change (`oi_change_15m`, `oi_change_session`), basis, and futures execution.
- **`lot_size`**: The minimum futures execution unit. Position construction must respect it exactly.

The futures contract rotates at monthly expiry; the historical cash series remains continuous and is never rewritten during contract rotation.

---

## 4. Sectoral Taxonomy & Battalion Clustering

`market.instruments` classifies each asset with `sector` and `industry` metadata:

- **Sectors**: `METALS`, `REALTY`, `DEFENCE_AERO`, `IT_TECH`, `BANKS_PSU`, `BANKS_PVT`, `FINANCIALS`, `AUTOS`, `ENERGY_OIL_GAS`, `POWER_GREEN`, `PHARMA_HEALTH`, `FMCG_CONSUMER`, `CAPITAL_GOODS_INFRA`, etc.
- **Battalion Scanner Usage**: When $\ge 2$ siblings in the same sector fire synchronized RVOL ($\ge 2.0x$) on the same side of VWAP, the scanner flags a high-probability **Sector Battalion**.

---

## 5. Decision Funnel

```text
Active 210 F&O Universe (market.instruments)
  → Deterministic 15-minute feature bar close (market.intraday_features_1m)
  → RVOL >= 2.0x & VWAP Alignment Gate
  → Sector Battalion Clustering (battalion_scanner.py)
  → Top 5 High-Conviction Setups (₹10,000 margin / ₹50,000 gross exposure each)
  → Scout HUD Automated Checkpoints & Trailing Trajectory
```
