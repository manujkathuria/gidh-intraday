import { DocArticle } from "./types";

export const DATABASE_SCHEMA_DOC: DocArticle = {
  id: "backend-database-schema",
  title: "TimescaleDB & PostgreSQL Schema Reference",
  shortTitle: "Database & Tables",
  description: "Comprehensive schema reference for market hypertables, statistical feature tables, and the quant AI cognitive schema.",
  category: "backend",
  readTime: "5 min read",
  content: `
# TimescaleDB & PostgreSQL Schema Reference

The **Gidh Intraday Platform** relies on **TimescaleDB** on top of PostgreSQL. The database is cleanly partitioned into two core schemas:
1. **\`market\`**: Raw streaming tick hypertables, 1m/1d OHLCV candles, statistical features, and futures dynamics.
2. **\`quant\`**: Universal AI Brain session persistence (\`brain_sessions\`) and persistent cognitive memory (\`brain_memory\`).

---

## 1. Schema Entity Relationship & Topology

\`\`\`mermaid
flowchart TD
    subgraph MarketSchema ["Schema: market (Market Data & Features)"]
        Inst["market.instruments<br/>(210 F&O Universe Stocks)"]
        FutCont["market.future_contracts<br/>(Active Monthly/Near Expiries)"]
        
        Cash1m["market.cash_candles_1m<br/>(TimescaleDB Hypertable)"]
        Cash1d["market.cash_candles_1d<br/>(Daily Cash OHLCV)"]
        
        Fut1m["market.future_candles_1m<br/>(TimescaleDB Hypertable)"]
        Fut1d["market.future_candles_1d<br/>(Daily Futures OHLCV + OI)"]
        
        Feat1m["market.intraday_features_1m<br/>(47 Quant Realtime Features)"]
        Feat1d["market.daily_features<br/>(ATR-14, ADR-20, CPR Pivots)"]
        
        Runs["market.feature_runs<br/>(Batch Execution Runs)"]
    end

    subgraph QuantSchema ["Schema: quant (AI Brain Cognition)"]
        Sessions["quant.brain_sessions<br/>(Daily Decisions, Features & Outcomes)"]
        Memory["quant.brain_memory<br/>(Persistent Rolling Cognitive Memory)"]
    end

    Inst --> Cash1m
    Inst --> Cash1d
    Inst --> FutCont
    FutCont --> Fut1m
    FutCont --> Fut1d
    
    Cash1m --> Feat1m
    Cash1d --> Feat1d
    
    Feat1d --> Sessions
    Fut1d --> Sessions
    Feat1m --> Sessions
    
    Sessions -->|EOD Forensics Loop| Memory
    Memory -.->|Injects Prior Rules| Sessions
\`\`\`

---


## 2. Market Data Hypertables (\`market\`)

### \`market.instruments\`
Master registry for all tradable cash equity instruments in the F&O universe.
| Column | Type | Description |
| :--- | :--- | :--- |
| \`id\` | \`BIGSERIAL PRIMARY KEY\` | Internal instrument unique ID. |
| \`symbol\` | \`VARCHAR NOT NULL UNIQUE\` | NSE trading symbol (e.g. \`ADANIENT\`, \`RELIANCE\`). |
| \`name\` | \`VARCHAR\` | Company legal name. |
| \`exchange\` | \`VARCHAR NOT NULL\` | Exchange code (\`NSE\`). |
| \`cash_token\` | \`BIGINT NOT NULL UNIQUE\` | Zerodha Kite instrument token for cash quote. |
| \`tick_size\` | \`NUMERIC(8,4)\` | Price minimum tick granularity (₹0.05). |
| \`sector\` | \`VARCHAR\` | Sector classification code (e.g. \`CAPITAL_GOODS_INFRA\`). |
| \`is_active\` | \`BOOLEAN\` | Active trading status flag. |

---

### \`market.cash_candles_1m\` *(TimescaleDB Hypertable)*
1-minute completed cash OHLCV candles partitioned by time chunk.
| Column | Type | Description |
| :--- | :--- | :--- |
| \`instrument_id\` | \`BIGINT NOT NULL\` | Foreign key referencing \`market.instruments(id)\`. |
| \`ts\` | \`TIMESTAMPTZ NOT NULL\` | 1-minute bucket timestamp (chunk partition key). |
| \`open\` | \`NUMERIC(12,4)\` | 1-minute open price. |
| \`high\` | \`NUMERIC(12,4)\` | 1-minute highest price. |
| \`low\` | \`NUMERIC(12,4)\` | 1-minute lowest price. |
| \`close\` | \`NUMERIC(12,4)\` | 1-minute close price. |
| \`volume\` | \`BIGINT NOT NULL\` | 1-minute traded share volume. |

---

### \`market.future_candles_1d\`
Daily futures contracts OHLCV + Open Interest (OI) tracking.
| Column | Type | Description |
| :--- | :--- | :--- |
| \`instrument_id\` | \`BIGINT NOT NULL\` | Foreign key referencing underlying cash instrument. |
| \`future_contract_id\` | \`BIGINT NOT NULL\` | References \`market.future_contracts(id)\`. |
| \`session_date\` | \`DATE NOT NULL\` | Trading session date. |
| \`close\` | \`NUMERIC(12,4)\` | Daily futures settlement close price. |
| \`open_interest\` | \`BIGINT NOT NULL\` | EOD Open Interest in number of contracts/shares. |
| \`volume\` | \`BIGINT NOT NULL\` | Daily traded futures volume. |

---

### \`market.intraday_features_1m\` *(TimescaleDB Hypertable)*
47 real-time mathematical features flushed every 60 seconds.
| Column | Type | Description |
| :--- | :--- | :--- |
| \`instrument_id\` | \`BIGINT NOT NULL\` | Instrument reference. |
| \`ts\` | \`TIMESTAMPTZ NOT NULL\` | 1-minute evaluation boundary timestamp. |
| \`session_open\` | \`NUMERIC(12,4)\` | Day open price at 09:15:00. |
| \`session_vwap\` | \`NUMERIC(12,4)\` | Intraday cumulative VWAP. |
| \`vwap_upper_1\`, \`_2\` | \`NUMERIC(12,4)\` | $+1\\sigma$ and $+2\\sigma$ standard deviation bands. |
| \`vwap_lower_1\`, \`_2\` | \`NUMERIC(12,4)\` | $-1\\sigma$ and $-2\\sigma$ standard deviation bands. |
| \`relative_volume\` | \`NUMERIC(8,4)\` | **RVOL**: Cumulative volume vs. historical expected volume. |
| \`clv\` | \`NUMERIC(8,4)\` | **Close Location Value** $[-1.0, +1.0]$. |
| \`cumulative_volume\` | \`BIGINT\` | Total shares traded since 09:15 AM. |

---

### \`market.daily_features\`
EOD baseline technical levels calculated for next day trading.
| Column | Type | Description |
| :--- | :--- | :--- |
| \`instrument_id\` | \`BIGINT NOT NULL\` | Instrument reference. |
| \`session_date\` | \`DATE NOT NULL\` | Prior trading date. |
| \`prior_close\` | \`NUMERIC(12,4)\` | Adjusted previous trading close price. |
| \`pivot_p\`, \`_tc\`, \`_bc\` | \`NUMERIC(12,4)\` | Central Pivot Range levels (Pivot, Top Central, Bottom Central). |
| \`cpr_width_pct\` | \`NUMERIC(8,4)\` | $\\frac{|\\text{TC} - \\text{BC}|}{\\text{Pivot}} \\times 100$ (Coiling measure). |
| \`adr_20_pts\` | \`NUMERIC(12,4)\` | 20-day Average Daily Range in price points. |
| \`atr_14_pts\` | \`NUMERIC(12,4)\` | 14-day Average True Range. |
| \`sma_20\`, \`sma_50\` | \`NUMERIC(12,4)\` | 20-day and 50-day simple moving averages. |

---

## 3. Quant AI Brain Schema (\`quant\`)

### \`quant.brain_sessions\`
Permanent execution ledger for all autonomous Brain decisions and EOD reviews.
| Column | Type | Description |
| :--- | :--- | :--- |
| \`session_date\` | \`DATE NOT NULL\` | Target trading session date (\`YYYY-MM-DD\`). |
| \`brain_id\` | \`VARCHAR(64) NOT NULL\` | Brain identifier (\`macro_selector\`, \`micro_brain\`). |
| \`decisions\` | \`JSONB NOT NULL\` | Tactical decisions payload (Focus Bulls/Bears, or 4 Bracket Orders). |
| \`sensory_features\` | \`JSONB\` | Raw multidimensional sensory metrics snapshot. |
| \`ai_thesis\` | \`TEXT NOT NULL\` | Autonomous reasoning narrative explaining the setup. |
| \`outcomes\` | \`JSONB\` | Post-market replay metrics (MFE, MAE, Win/Loss, Net R). |
| \`forensics\` | \`TEXT\` | Qualitative retrospective summary and lessons learned. |
| \`created_at\` | \`TIMESTAMPTZ\` | Timestamp when pre-market decisions were recorded. |
| \`reviewed_at\` | \`TIMESTAMPTZ\` | Timestamp when EOD forensic review was committed. |
| **PRIMARY KEY** | \`(session_date, brain_id)\` | Composite primary key enforcing unique daily sessions per brain. |

---

### \`quant.brain_memory\`
Persistent rolling cognitive memory buffer for continuous learning.
| Column | Type | Description |
| :--- | :--- | :--- |
| \`brain_id\` | \`VARCHAR(64) PRIMARY KEY\` | Brain identifier (\`macro_selector\`, \`micro_brain\`). |
| \`memory_state\` | \`JSONB NOT NULL\` | Distilled state buffer containing active campaigns, learned rules, and rolling win rates. |
| \`updated_at\` | \`TIMESTAMPTZ\` | Timestamp of most recent memory update. |
`
};
