# Market Facts and Sensors

The Go backend owns deterministic market calculations. The AI layer consumes their outputs as evidence and must preserve the raw inputs, calculation version, and timestamp with every decision. A sensor is a measurement, not a bullish or bearish conclusion.

## Data quality first

Before interpreting a sensor, verify that the associated cash and futures bars are current, the session is open, and the value is present. Missing, stale, or zero-denominator data produces `unknown`, not a neutral or favourable signal.

## Core measurements

| Measurement | Meaning | Formula / source |
| --- | --- | --- |
| CLV | Where a candle closes within its range | `(2C - H - L) / (H - L)`; undefined for a zero-range bar |
| Wicks | Rejection within a bar | upper/lower body-to-extreme distances divided by range |
| RVOL | Current participation versus baseline | current bar volume / comparable rolling volume baseline |
| CPR | Prior-day structural pivot range | Pivot `(H+L+C)/3`, BC `(H+L)/2`, TC `2×Pivot-BC` |
| Boundary distance | Position relative to PDH/PDL or other reference | price distance, normalized only when the baseline is valid |
| ADR fuel used | Fraction of normal daily range already consumed | `(day high - day low) / ADR` |
| Futures OI delta | Change in active future participation | current OI minus prior valid OI |
| Futures basis | Difference between futures and cash | `fut_close - cash_close` |
| VWAP bands | Session auction reference and dispersion | backend VWAP and standard-deviation bands |

## OI quadrant convention

The system may label the joint price/OI movement for the active future:

| Price | OI | Label |
| --- | --- | --- |
| Up | Up | `LONG_BUILDUP` |
| Up | Down | `SHORT_COVERING` |
| Down | Up | `SHORT_BUILDUP` |
| Down | Down | `LONG_UNWINDING` |

These labels describe one observation window. They do not establish intent, duration, or future direction on their own.

## Interpretation discipline

An actionable thesis should cite at least one price-structure fact and one participation or liquidity fact. It must also name contradictory evidence. Examples: price holding above VWAP is a fact; “institutional accumulation” is a hypothesis supported or weakened by price, RVOL, OI, and basis together.

Never encode subjective trade rules in the data producer. Versioned policies belong in the AI/decision layer, where they can be tested and audited.

## Telemetry contract

`GET /api/v1/telemetry?symbol={SYMBOL}` exposes a live bundle of CPR, boundary, ADR, CLV/RVOL, and OI fields. It is suitable for observation only after its freshness and field names are verified against the current backend handler. Consumers must be tolerant of additions and must fail closed on missing fields.
