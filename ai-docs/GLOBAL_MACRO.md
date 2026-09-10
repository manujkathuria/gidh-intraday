# Macro Context

Macro is the session backdrop for Indian equities. It adjusts priors, concentration, and which contradictions deserve attention; it never overrides the trade universe gate or turns an unsupported price move into a trade.

## Inputs

The standard pre-market snapshot considers:

| Input | Why it matters | Example affected exposures |
| --- | --- | --- |
| GIFT Nifty and prior Nifty close | Expected opening tone and gap context | broad index-sensitive names |
| Brent crude | India’s imported-energy and margin sensitivity | aviation, oil marketing, upstream energy |
| US technology / Nasdaq | Overnight demand context for Indian technology exporters | IT / technology |
| DXY and USD/INR | Currency and foreign-flow context | high foreign-ownership financials and exporters |
| Asian session | Regional risk appetite before NSE open | broad risk appetite |

Every input record needs a source, observation timestamp, prior comparison, and value. A missing or delayed feed must lower confidence rather than be filled with narrative.

## Regime vocabulary

The current working labels are `BULLISH_TREND`, `BEARISH_TREND`, `CHOP_SELECTIVE`, and `CRUDE_RISK`. They are compressed descriptions of the snapshot, not forecasts. A regime record must store the inputs and thresholds that produced it so it can be replayed.

| Regime | Decision posture |
| --- | --- |
| `BULLISH_TREND` | Permit long-biased candidates, while requiring stock-level confirmation. |
| `BEARISH_TREND` | Permit short-biased candidates, while requiring stock-level confirmation. |
| `CHOP_SELECTIVE` | Reduce breadth and demand unusually clear idiosyncratic evidence. |
| `CRUDE_RISK` | Inspect sector dispersion and crude-sensitive exposures explicitly. |

Thresholds are policy parameters, not market truths. They must be versioned, backtested, and changed deliberately.

## Required macro output

The macro component should emit a compact, auditable snapshot:

```json
{
  "as_of": "2026-09-10T08:50:00+05:30",
  "regime": "CHOP_SELECTIVE",
  "confidence": 0.62,
  "inputs": [],
  "tailwind_exposures": [],
  "headwind_exposures": [],
  "contradictions": [],
  "policy_version": "macro-v1"
}
```

An LLM may translate a verified snapshot into a short human briefing. It must not source prices, choose thresholds invisibly, or replace the deterministic regime calculation.
