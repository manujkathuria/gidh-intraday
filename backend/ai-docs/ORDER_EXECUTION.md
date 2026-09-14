# Execution Boundary

The AI is a decision-maker, not the broker. Zerodha/Kite is the source of truth for real orders, fills, positions, and realised P&L. The Go backend routes validated intents, reconciles broker state, and exposes it to the cockpit; Redis may cache active state but is never authoritative after a disagreement.

## State flow

```text
market evidence → AI decision → execution intent → policy validation
  → broker order → broker fill/rejection → reconciliation → durable audit
```

No arrow may be skipped. In particular, an LLM response must never be translated directly into a broker call.

## Decision versus intent

A decision says what the AI believes: `OBSERVE`, `ARMED`, `ENTER`, `HOLD`, `REDUCE`, `EXIT`, or `INVALIDATED`. An execution intent says exactly what may be sent: instrument, side, quantity, order type, session, and authorisation. The policy validator rejects intents that are stale, unapproved, out of session, outside the universe, inconsistent with current broker state, or beyond configured limits.

## Heavy-armour operating policy

The intended style does not rely on a conventional fixed stop-loss for ordinary market noise. Instead it must declare, before entry:

- maximum concurrent positions and sector-correlated exposure;
- maximum total leverage/capital allocation and permitted lot increments;
- whether and how any averaging is allowed, including a hard cap on additions;
- the thesis invalidation condition and who/what can act on it;
- a time-based exit or broker/session square-off requirement;
- stale-data, broker-reconciliation, and emergency kill-switch behaviour.

These are hard policy controls, not optional prose in a model rationale. Any future automated live execution requires explicit human approval of the policy and configuration.

## Broker safeguards

The existing backend includes order-rate, per-symbol cooldown, daily order-count, reconciliation, and kill-switch mechanisms. Preserve and test these safeguards when redesigning the AI; they remain active even if the strategy changes.

## Failure handling

- Broker or feed disagreement: stop new intents for affected symbols and reconcile.
- Missing active future or invalid lot size: reject intent.
- Stale market data: downgrade to `OBSERVE`; do not act.
- Manual broker action: ingest it as authoritative and update the AI decision context.
- Kill switch: block all automated broker interaction until an authorised reset and reconciliation succeed.
