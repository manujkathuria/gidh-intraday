import sys
import os
from pathlib import Path

# Add project root directory to python path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from quant.base.db import get_db_connection


st.set_page_config(
    page_title="GIDH — Step 1 Futures Institutional Inflow Cockpit",
    page_icon="🦅",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Styling
st.markdown("""
<style>
    /* Clean Simple Card Styling */
    div[data-testid="stMetric"] {
        background-color: #f9fafc !important;
        border: 1px solid #e2e8f0 !important;
        padding: 16px 20px !important;
        border-radius: 8px !important;
    }
    div[data-testid="stMetric"] label {
        color: #64748b !important;
        font-size: 0.85rem !important;
        font-weight: 600 !important;
    }
    div[data-testid="stMetric"] div[data-testid="stMetricValue"] {
        color: #1e2939 !important;
        font-size: 1.8rem !important;
        font-weight: 700 !important;
    }
    div[data-testid="stMetric"] div[data-testid="stMetricDelta"] {
        color: #2563eb !important;
        font-weight: 600 !important;
    }
</style>
""", unsafe_allow_html=True)

@st.cache_data(ttl=60)
def get_available_dates():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT DISTINCT session_date 
        FROM market.future_candles_1d 
        WHERE session_date >= '2026-08-20'
        ORDER BY session_date DESC;
    """)
    dates = [r[0].strftime('%Y-%m-%d') for r in cur.fetchall()]
    return dates

@st.cache_data(ttl=60)
def load_futures_data(selected_date):
    conn = get_db_connection()
    sql = """
    WITH fut_data AS (
        SELECT 
            fc.instrument_id,
            fc.trading_symbol,
            f1d.session_date,
            f1d.close AS fut_close,
            f1d.open_interest AS fut_oi,
            f1d.volume AS fut_volume,
            LAG(f1d.close, 1) OVER (PARTITION BY fc.instrument_id ORDER BY f1d.session_date) AS prev_close,
            LAG(f1d.open_interest, 1) OVER (PARTITION BY fc.instrument_id ORDER BY f1d.session_date) AS prev_oi,
            LAG(f1d.open_interest, 3) OVER (PARTITION BY fc.instrument_id ORDER BY f1d.session_date) AS oi_3d_ago,
            LAG(f1d.open_interest, 5) OVER (PARTITION BY fc.instrument_id ORDER BY f1d.session_date) AS oi_5d_ago
        FROM market.future_candles_1d f1d
        JOIN market.future_contracts fc ON f1d.future_contract_id = fc.id
        WHERE f1d.session_date <= %s
    ),
    exact_session AS (
        SELECT 
            instrument_id,
            trading_symbol,
            session_date,
            fut_close,
            fut_oi,
            prev_close,
            prev_oi,
            ROUND((fut_close * fut_oi / 10000000.0)::numeric, 2) AS total_notional_cr,
            ROUND(((fut_close - prev_close) / NULLIF(prev_close, 0) * 100)::numeric, 2) AS price_1d_pct,
            ROUND(((fut_oi - prev_oi)::numeric / NULLIF(prev_oi, 0) * 100)::numeric, 2) AS oi_1d_pct,
            ROUND(((fut_oi - prev_oi) * fut_close / 10000000.0)::numeric, 2) AS fresh_inflow_1d_cr,
            ROUND(((fut_oi - oi_3d_ago)::numeric / NULLIF(oi_3d_ago, 0) * 100)::numeric, 2) AS oi_3d_pct,
            ROUND(((fut_oi - oi_3d_ago) * fut_close / 10000000.0)::numeric, 2) AS fresh_inflow_3d_cr
        FROM fut_data
        WHERE session_date = %s
    )
    SELECT 
        i.symbol,
        es.trading_symbol,
        es.session_date,
        es.fut_close,
        es.prev_close,
        es.fut_oi,
        es.prev_oi,
        es.total_notional_cr,
        es.price_1d_pct,
        es.oi_1d_pct,
        es.fresh_inflow_1d_cr,
        es.oi_3d_pct,
        es.fresh_inflow_3d_cr
    FROM exact_session es
    JOIN market.instruments i ON es.instrument_id = i.id
    ORDER BY es.fresh_inflow_1d_cr DESC NULLS LAST;
    """
    df = pd.read_sql(sql, conn, params=(selected_date, selected_date))
    return df

# --- SIDEBAR CONTROLS ---
st.sidebar.title("🦅 GIDH Quant Settings")
dates = get_available_dates()
selected_date = st.sidebar.selectbox("📅 Select Trading Session", dates, index=dates.index("2026-08-25") if "2026-08-25" in dates else 0)

st.sidebar.markdown("---")
st.sidebar.subheader("🎯 Step 1 Filter Thresholds")
min_inflow = st.sidebar.slider("Min 1-Day Inflow (₹ Crores)", 0.0, 200.0, 50.0, step=5.0)
min_oi_pct = st.sidebar.slider("Min 1-Day OI Change (%)", 0.0, 20.0, 5.0, step=0.5)
min_price_pct = st.sidebar.slider("Min Price Move (%)", 0.0, 5.0, 0.75, step=0.25)
price_range = st.sidebar.slider("Futures Price Filter (₹)", 100, 10000, (300, 5000), step=100)

raw_df = load_futures_data(selected_date)

# Apply dynamic price range filtering
df = raw_df[(raw_df['fut_close'] >= price_range[0]) & (raw_df['fut_close'] <= price_range[1])].copy()

# Classify Institutional Quadrant dynamically with current slider values
def classify_quadrant(row):
    p = row['price_1d_pct'] if pd.notnull(row['price_1d_pct']) else 0.0
    oi = row['oi_1d_pct'] if pd.notnull(row['oi_1d_pct']) else 0.0
    inflow = row['fresh_inflow_1d_cr'] if pd.notnull(row['fresh_inflow_1d_cr']) else 0.0

    # Strict Institutional Thresholds
    is_long = (p >= min_price_pct) and (inflow >= min_inflow) and (oi >= min_oi_pct)
    is_short = (p <= -min_price_pct) and (inflow >= min_inflow or oi >= min_oi_pct)

    if is_long:
        return "🟢 LONG ACCUMULATION"
    elif is_short:
        return "🔴 SHORT ATTACK"
    elif p < 0 and oi < 0:
        return "⚠️ LONG UNWINDING"
    elif p > 0 and oi < 0:
        return "⚡ SHORT COVERING"
    else:
        return "⚪ NEUTRAL / CHOP"

df['institutional_state'] = df.apply(classify_quadrant, axis=1)

# --- MAIN DASHBOARD ---
st.title(f"🏛️ STEP 1: Institutional Futures Inflow Radar")
st.caption(f"Session: **{selected_date}** | Total Universe: **{len(df)} F&O Equities** | Data Source: **TimescaleDB**")

# Top Metrics Row
col1, col2, col3, col4 = st.columns(4)
longs_df = df[df['institutional_state'] == "🟢 LONG ACCUMULATION"].sort_values(by='fresh_inflow_1d_cr', ascending=False)
shorts_df = df[df['institutional_state'] == "🔴 SHORT ATTACK"].sort_values(by='fresh_inflow_1d_cr', ascending=False)
unwinding_df = df[df['institutional_state'] == "⚠️ LONG UNWINDING"]
covering_df = df[df['institutional_state'] == "⚡ SHORT COVERING"]

with col1:
    st.metric("🟢 Long Accumulation", f"{len(longs_df)} Stocks", f"Top Inflow: ₹{longs_df['fresh_inflow_1d_cr'].max():.1f} Cr" if not longs_df.empty else "-")
with col2:
    st.metric("🔴 Short Attack", f"{len(shorts_df)} Stocks", f"Top Short: ₹{shorts_df['fresh_inflow_1d_cr'].max():.1f} Cr" if not shorts_df.empty else "-")
with col3:
    st.metric("⚠️ Long Unwinding", f"{len(unwinding_df)} Stocks")
with col4:
    st.metric("⚡ Short Covering", f"{len(covering_df)} Stocks")

st.markdown("---")

# 2-Column Institutional Watchlist (Longs vs Shorts)
col_left, col_right = st.columns(2)

with col_left:
    st.subheader("🟢 TOP INSTITUTIONAL LONGS (Price $\\ge +0.75\%$ + Inflow $\\ge ₹50\\text{Cr}$)")
    if not longs_df.empty:
        display_cols = ['symbol', 'fut_close', 'price_1d_pct', 'oi_1d_pct', 'fresh_inflow_1d_cr', 'total_notional_cr', 'fresh_inflow_3d_cr']
        st.dataframe(
            longs_df[display_cols].rename(columns={
                'symbol': 'Symbol',
                'fut_close': 'Price (₹)',
                'price_1d_pct': 'Price %',
                'oi_1d_pct': 'OI %',
                'fresh_inflow_1d_cr': '1D Inflow (₹Cr)',
                'total_notional_cr': 'Total Notional (₹Cr)',
                'fresh_inflow_3d_cr': '3D Inflow (₹Cr)'
            }),
            use_container_width=True,
            height=380
        )
    else:
        st.info("No stocks met the Long Accumulation criteria on this session.")

with col_right:
    st.subheader("🔴 TOP INSTITUTIONAL SHORTS (Price $\\le -0.75\%$ + Inflow $\\ge ₹50\\text{Cr}$)")
    if not shorts_df.empty:
        display_cols = ['symbol', 'fut_close', 'price_1d_pct', 'oi_1d_pct', 'fresh_inflow_1d_cr', 'total_notional_cr', 'fresh_inflow_3d_cr']
        st.dataframe(
            shorts_df[display_cols].rename(columns={
                'symbol': 'Symbol',
                'fut_close': 'Price (₹)',
                'price_1d_pct': 'Price %',
                'oi_1d_pct': 'OI %',
                'fresh_inflow_1d_cr': '1D Inflow (₹Cr)',
                'total_notional_cr': 'Total Notional (₹Cr)',
                'fresh_inflow_3d_cr': '3D Inflow (₹Cr)'
            }),
            use_container_width=True,
            height=380
        )
    else:
        st.info("No stocks met the Short Attack criteria on this session.")

# Quadrant Chart
st.markdown("---")
st.subheader("📊 Institutional Price vs. Money Inflow Map")

fig = px.scatter(
    df,
    x='oi_1d_pct',
    y='price_1d_pct',
    size='total_notional_cr',
    color='institutional_state',
    hover_name='symbol',
    hover_data=['fut_close', 'fresh_inflow_1d_cr', 'total_notional_cr'],
    color_discrete_map={
        "🟢 LONG ACCUMULATION": "#10b981",
        "🔴 SHORT ATTACK": "#ef4444",
        "⚠️ LONG UNWINDING": "#f59e0b",
        "⚡ SHORT COVERING": "#3b82f6",
        "⚪ NEUTRAL / CHOP": "#6b7280"
    },
    labels={
        'oi_1d_pct': 'Open Interest 1-Day Change (%)',
        'price_1d_pct': 'Futures Daily Price Change (%)',
        'total_notional_cr': 'Total Notional (₹Cr)'
    },
    title=f"All F&O Equities on {selected_date} (Bubble size = Total ₹ Open Interest Notional)"
)

fig.add_hline(y=0, line_dash="dash", line_color="#4b5563")
fig.add_vline(x=0, line_dash="dash", line_color="#4b5563")
fig.update_layout(template="plotly_dark", height=550)
st.plotly_chart(fig, use_container_width=True)
