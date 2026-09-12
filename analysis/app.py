import os
import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# --- Database Config ---
DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASSWORD", "P@ssw0rd")
DB_NAME = os.getenv("DB_NAME", "gidh_intraday")

def get_db_connection():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        dbname=DB_NAME
    )

# --- Sector Mapping (210 F&O Universe) ---
SECTOR_MAP = {
    # IT / Tech
    'TCS': 'IT', 'INFY': 'IT', 'TECHM': 'IT', 'WIPRO': 'IT', 'HCLTECH': 'IT',
    'LTM': 'IT', 'PERSISTENT': 'IT', 'COFORGE': 'IT', 'MPHASIS': 'IT', 'LTTS': 'IT',
    'TATAELXSI': 'IT', 'OFSS': 'IT', 'CYIENT': 'IT', 'KPITTECH': 'IT',
    
    # Banking (Private & PSU)
    'HDFCBANK': 'BANKING', 'ICICIBANK': 'BANKING', 'KOTAKBANK': 'BANKING', 'AXISBANK': 'BANKING',
    'SBIN': 'BANKING', 'INDUSINDBK': 'BANKING', 'FEDERALBNK': 'BANKING', 'IDFCFIRSTB': 'BANKING',
    'BANDHANBNK': 'BANKING', 'BANKBARODA': 'BANKING', 'PNB': 'BANKING', 'CANBK': 'BANKING',
    'BANKINDIA': 'BANKING', 'UNIONBANK': 'BANKING', 'AUBANK': 'BANKING',
    
    # Financial Services / NBFC / AMC / Insurance
    'BAJFINANCE': 'FIN_SERVICES', 'BAJAJFINSV': 'FIN_SERVICES', 'CHOLAFIN': 'FIN_SERVICES',
    'SHRIRAMFIN': 'FIN_SERVICES', 'M&MFIN': 'FIN_SERVICES', 'MUTHOOTFIN': 'FIN_SERVICES',
    'MANAPPURAM': 'FIN_SERVICES', 'ABCAPITAL': 'FIN_SERVICES', 'POONAWALLA': 'FIN_SERVICES',
    'HDFCLIFE': 'INSURANCE', 'SBILIFE': 'INSURANCE', 'ICICIPRULI': 'INSURANCE', 'ICICIGI': 'INSURANCE',
    'HDFCAMC': 'FIN_SERVICES', 'NAM-INDIA': 'FIN_SERVICES', '360ONE': 'FIN_SERVICES',
    'JIOFIN': 'FIN_SERVICES', 'BSE': 'FIN_SERVICES', 'MCX': 'FIN_SERVICES', 'CDSL': 'FIN_SERVICES',
    'CAMS': 'FIN_SERVICES', 'ANGELONE': 'FIN_SERVICES', 'MOTILALOFS': 'FIN_SERVICES',
    
    # Auto & Auto Ancillaries
    'TATAMOTORS': 'AUTO', 'M&M': 'AUTO', 'MARUTI': 'AUTO', 'BAJAJ-AUTO': 'AUTO',
    'HEROMOTOCO': 'AUTO', 'EICHERMOT': 'AUTO', 'TVSMOTOR': 'AUTO', 'ASHOKLEY': 'AUTO',
    'ATHERENERG': 'AUTO', 'BHARATFORG': 'AUTO_ANC', 'MOTHERSON': 'AUTO_ANC',
    'BOSCHLTD': 'AUTO_ANC', 'MRF': 'AUTO_ANC', 'BALKRISIND': 'AUTO_ANC', 'APOLLOTYRE': 'AUTO_ANC',
    'EXIDEIND': 'AUTO_ANC', 'AMARAJABAT': 'AUTO_ANC', 'SONACOMS': 'AUTO_ANC', 'TIINDIA': 'AUTO_ANC',
    'UNOMINDA': 'AUTO_ANC', 'CRAFTSMAN': 'AUTO_ANC', 'HYUNDAI': 'AUTO',
    
    # Capital Goods, Power Equipment, Industrial Manufacturing
    'ABB': 'CAP_GOODS', 'SIEMENS': 'CAP_GOODS', 'BHEL': 'CAP_GOODS', 'GVT&D': 'CAP_GOODS',
    'POWERINDIA': 'CAP_GOODS', 'CUMMINSIND': 'CAP_GOODS', 'THERMAX': 'CAP_GOODS',
    'SUZLON': 'CAP_GOODS', 'KEC': 'CAP_GOODS', 'POLYCAB': 'CAP_GOODS', 'KEI': 'CAP_GOODS',
    'HAVELLS': 'CAP_GOODS', 'VOLTAS': 'CAP_GOODS', 'BLUESTARCO': 'CAP_GOODS', 'DIXON': 'CAP_GOODS',
    'AMBER': 'CAP_GOODS', 'PGEL': 'CAP_GOODS', 'KAYNES': 'CAP_GOODS',
    
    # Infrastructure, Real Estate & Construction
    'LT': 'INFRA', 'DLF': 'REALTY', 'GODREJPROP': 'REALTY', 'OBEROIRLTY': 'REALTY',
    'PHOENIXLTD': 'REALTY', 'PRESTIGE': 'REALTY', 'BRIGADE': 'REALTY', 'LODHA': 'REALTY',
    'NBCC': 'INFRA', 'NCC': 'INFRA', 'PNCINFRA': 'INFRA', 'IRB': 'INFRA',
    'GMRINFRA': 'INFRA', 'GMRAIRPORT': 'INFRA',
    
    # Pharma & Healthcare
    'SUNPHARMA': 'PHARMA', 'DRREDDY': 'PHARMA', 'CIPLA': 'PHARMA', 'DIVISLAB': 'PHARMA',
    'LUPIN': 'PHARMA', 'AUROPHARMA': 'PHARMA', 'ALKEM': 'PHARMA', 'TORNTPHARM': 'PHARMA',
    'ZYDUSLIFE': 'PHARMA', 'MANKIND': 'PHARMA', 'BIOCON': 'PHARMA', 'GLENMARK': 'PHARMA',
    'IPCALAB': 'PHARMA', 'LAURUSLABS': 'PHARMA', 'GRANULES': 'PHARMA',
    'APOLLOHOSP': 'HEALTHCARE', 'FORTIS': 'HEALTHCARE', 'MAXHEALTH': 'HEALTHCARE', 'MEDANTA': 'HEALTHCARE',
    'LALPATHLAB': 'HEALTHCARE', 'SYNGENE': 'PHARMA',
    
    # Power & Energy
    'NTPC': 'POWER', 'POWERGRID': 'POWER', 'TATAPOWER': 'POWER', 'ADANIPOWER': 'POWER',
    'ADANIGREEN': 'POWER', 'ADANIENSOL': 'POWER', 'JSWENERGY': 'POWER', 'NHPC': 'POWER',
    'SJVN': 'POWER', 'IEX': 'POWER', 'TORNTPOWER': 'POWER', 'CESC': 'POWER',
    
    # Oil, Gas & Petrochemicals
    'RELIANCE': 'OIL_GAS', 'ONGC': 'OIL_GAS', 'OIL': 'OIL_GAS', 'IOC': 'OIL_GAS',
    'BPCL': 'OIL_GAS', 'HPCL': 'OIL_GAS', 'GAIL': 'OIL_GAS', 'PETRONET': 'OIL_GAS',
    'IGL': 'OIL_GAS', 'MGL': 'OIL_GAS', 'GUJGASLTD': 'OIL_GAS', 'GSPL': 'OIL_GAS',
    
    # Metals & Mining
    'TATASTEEL': 'METALS', 'JSWSTEEL': 'METALS', 'HINDALCO': 'METALS', 'JINDALSTEL': 'METALS',
    'VEDL': 'METALS', 'NATIONALUM': 'METALS', 'NMDC': 'METALS', 'SAIL': 'METALS',
    'COALINDIA': 'METALS', 'HINDZINC': 'METALS', 'APLAPOLLO': 'METALS',
    
    # FMCG & Consumption
    'ITC': 'FMCG', 'HINDUNILVR': 'FMCG', 'NESTLEIND': 'FMCG', 'BRITANNIA': 'FMCG',
    'TATACONSUM': 'FMCG', 'DABUR': 'FMCG', 'MARICO': 'FMCG', 'GODREJCP': 'FMCG',
    'COLPAL': 'FMCG', 'VBL': 'FMCG', 'PATANJALI': 'FMCG', 'EMAMILTD': 'FMCG',
    'RADICO': 'CONSUMPTION', 'UBL': 'CONSUMPTION', 'MCDOWELL-N': 'CONSUMPTION',
    
    # Chemicals & Fertilizers
    'SRF': 'CHEMICALS', 'PIIND': 'CHEMICALS', 'AARTIIND': 'CHEMICALS', 'NAVINFLUOR': 'CHEMICALS',
    'DEEPAKNTR': 'CHEMICALS', 'TATACHEM': 'CHEMICALS', 'ATUL': 'CHEMICALS', 'FLUOROCHEM': 'CHEMICALS',
    'UPL': 'CHEMICALS', 'COROMANDEL': 'CHEMICALS', 'CHAMBLFERT': 'CHEMICALS', 'GNFC': 'CHEMICALS',
    
    # Telecom, Media, Logistics & New Age / Platforms
    'BHARTIARTL': 'TELECOM', 'IDEA': 'TELECOM', 'INDUSTOWER': 'TELECOM',
    'PVRINOX': 'MEDIA', 'SUNTV': 'MEDIA', 'ZEEL': 'MEDIA',
    'CONCOR': 'LOGISTICS', 'DELHIVERY': 'LOGISTICS', 'TCIEXP': 'LOGISTICS', 'VRL': 'LOGISTICS',
    'ETERNAL': 'NEW_AGE', 'ZOMATO': 'NEW_AGE', 'PAYTM': 'NEW_AGE', 'POLICYBZR': 'NEW_AGE', 'NYKAA': 'NEW_AGE',
    'NAUKRI': 'NEW_AGE', 'INDIAMART': 'NEW_AGE', 'MAPMYINDIA': 'NEW_AGE',
    
    # Cement & Building Materials
    'ULTRACEMCO': 'CEMENT', 'GRASIM': 'CEMENT', 'AMBUJACEM': 'CEMENT', 'ACC': 'CEMENT',
    'DALBHARAT': 'CEMENT', 'SHREECEM': 'CEMENT', 'RAMCOCEM': 'CEMENT', 'JKCEMENT': 'CEMENT',
    'ASTRAL': 'BLDG_MAT', 'SUPREMEIND': 'BLDG_MAT', 'KAJARIACER': 'BLDG_MAT', 'CENTURYPLY': 'BLDG_MAT',
    'PIDILITIND': 'BLDG_MAT', 'ASIANPAINT': 'BLDG_MAT', 'BERGEPAINT': 'BLDG_MAT', 'KANSAINER': 'BLDG_MAT',
    
    # Defence & PSUs
    'HAL': 'DEFENCE', 'BEL': 'DEFENCE', 'BDL': 'DEFENCE', 'MAZDOCK': 'DEFENCE',
    'COCHINSHIP': 'DEFENCE', 'GRSE': 'DEFENCE', 'IRCTC': 'PSU_RAIL', 'IRFC': 'PSU_RAIL',
    'RVNL': 'PSU_RAIL', 'IRCON': 'PSU_RAIL', 'TITAGARH': 'PSU_RAIL', 'RAILTEL': 'PSU_RAIL',
    'PFC': 'PSU_FIN', 'RECLTD': 'PSU_FIN', 'HUDCO': 'PSU_FIN', 'IREDA': 'PSU_FIN',
}

def get_sector(symbol: str) -> str:
    return SECTOR_MAP.get(symbol, 'OTHERS')

# --- Streamlit Layout ---
st.set_page_config(
    page_title="AoE2 Intraday War Room (09:15-09:30 Radar)",
    page_icon="🏰",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.markdown("""
<style>
    .reportview-container { background: #0e1117; }
    .stTabs [data-baseweb="tab"] { font-weight: 600; padding: 10px 20px; }
</style>
""", unsafe_allow_html=True)

@st.cache_data(ttl=3600)
def get_available_dates():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT DISTINCT date(ts AT TIME ZONE 'Asia/Kolkata') as trading_day
        FROM market.cash_candles_1m
        ORDER BY trading_day DESC;
    """)
    dates = [str(r[0]) for r in cur.fetchall()]
    conn.close()
    return dates

@st.cache_data(ttl=600)
def load_morning_scout_data(session_date_str: str, scouting_time_str: str):
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Extract prev day
    cur.execute("""
        SELECT DISTINCT date(ts AT TIME ZONE 'Asia/Kolkata') as trading_day
        FROM market.cash_candles_1m
        WHERE (ts AT TIME ZONE 'Asia/Kolkata')::date < %s
        ORDER BY trading_day DESC
        LIMIT 1;
    """, (session_date_str,))
    prev_date_row = cur.fetchone()
    prev_date_str = str(prev_date_row[0]) if prev_date_row else session_date_str

    query = """
    WITH prev_close AS (
        SELECT i.symbol, c.close as prev_close
        FROM market.cash_candles_1m c 
        JOIN market.instruments i ON c.instrument_id = i.id
        WHERE (c.ts AT TIME ZONE 'Asia/Kolkata')::date = %s
          AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time >= '15:29:00'
          AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time <= '15:30:00'
    ),
    open_candle AS (
        SELECT i.symbol, MIN(c.open) as day_open
        FROM market.cash_candles_1m c 
        JOIN market.instruments i ON c.instrument_id = i.id
        WHERE (c.ts AT TIME ZONE 'Asia/Kolkata')::date = %s
          AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time >= '09:15:00'
          AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time <= '09:16:00'
        GROUP BY i.symbol
    ),
    morning_bars AS (
        SELECT i.symbol,
            (ARRAY_AGG(c.close ORDER BY c.ts DESC))[1] as current_price,
            SUM(c.volume) as current_vol,
            MIN(c.low) as low_scout,
            MAX(c.high) as high_scout,
            SUM(c.close * c.volume) / NULLIF(SUM(c.volume), 0) as vwap_scout
        FROM market.cash_candles_1m c 
        JOIN market.instruments i ON c.instrument_id = i.id
        WHERE (c.ts AT TIME ZONE 'Asia/Kolkata')::date = %s
          AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time >= '09:15:00'
          AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time <= %s::time
        GROUP BY i.symbol
    ),
    hist_vol AS (
        SELECT i.symbol, AVG(sub.vol_window) as avg_vol_hist
        FROM (
            SELECT instrument_id, date_trunc('day', ts AT TIME ZONE 'Asia/Kolkata') as day, SUM(volume) as vol_window
            FROM market.cash_candles_1m
            WHERE (ts AT TIME ZONE 'Asia/Kolkata')::time >= '09:15:00'
              AND (ts AT TIME ZONE 'Asia/Kolkata')::time <= %s::time
              AND (ts AT TIME ZONE 'Asia/Kolkata')::date < %s
              AND (ts AT TIME ZONE 'Asia/Kolkata')::date >= (%s::date - INTERVAL '30 days')
            GROUP BY instrument_id, date_trunc('day', ts AT TIME ZONE 'Asia/Kolkata')
        ) sub
        JOIN market.instruments i ON sub.instrument_id = i.id
        GROUP BY i.symbol
    ),
    eod_truth AS (
        SELECT i.symbol,
            MAX(CASE WHEN (c.ts AT TIME ZONE 'Asia/Kolkata')::time <= '15:15:00' THEN c.close END) as eod_price,
            MAX(c.high) as eod_high,
            MIN(c.low) as eod_low
        FROM market.cash_candles_1m c 
        JOIN market.instruments i ON c.instrument_id = i.id
        WHERE (c.ts AT TIME ZONE 'Asia/Kolkata')::date = %s
          AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time >= '09:15:00'
          AND (c.ts AT TIME ZONE 'Asia/Kolkata')::time <= '15:30:00'
        GROUP BY i.symbol
    )
    SELECT 
        m.symbol,
        ROUND(((o.day_open - p.prev_close) / p.prev_close * 100)::numeric, 2) as gap_pct,
        ROUND(((m.current_price - p.prev_close) / p.prev_close * 100)::numeric, 2) as move_pct,
        ROUND(((m.current_price - m.vwap_scout) / m.vwap_scout * 100)::numeric, 2) as vwap_dist_pct,
        ROUND((m.current_vol / NULLIF(h.avg_vol_hist, 0))::numeric, 2) as rvol,
        ROUND(((m.current_price - m.low_scout) / NULLIF(m.high_scout - m.low_scout, 0))::numeric, 2) as clv,
        m.current_price,
        m.vwap_scout,
        m.current_vol,
        ROUND(((e.eod_price - m.current_price) / m.current_price * 100)::numeric, 2) as post_scout_return_pct,
        ROUND(((e.eod_price - p.prev_close) / p.prev_close * 100)::numeric, 2) as full_day_pct,
        ROUND(((e.eod_high - m.current_price) / m.current_price * 100)::numeric, 2) as max_mfe_long_pct,
        ROUND(((m.current_price - e.eod_low) / m.current_price * 100)::numeric, 2) as max_mfe_short_pct
    FROM morning_bars m
    JOIN prev_close p ON m.symbol = p.symbol
    JOIN open_candle o ON m.symbol = o.symbol
    LEFT JOIN hist_vol h ON m.symbol = h.symbol
    LEFT JOIN eod_truth e ON m.symbol = e.symbol;
    """
    
    cur.execute(query, (
        prev_date_str, 
        session_date_str, 
        session_date_str, scouting_time_str,
        scouting_time_str, session_date_str, session_date_str,
        session_date_str
    ))
    cols = [desc[0] for desc in cur.description]
    df = pd.DataFrame(cur.fetchall(), columns=cols)
    conn.close()
    
    if not df.empty:
        df['sector'] = df['symbol'].apply(get_sector)
        numeric_cols = [
            'gap_pct', 'move_pct', 'vwap_dist_pct', 'rvol', 'clv', 
            'current_price', 'vwap_scout', 'current_vol', 
            'post_scout_return_pct', 'full_day_pct', 'max_mfe_long_pct', 'max_mfe_short_pct'
        ]
        for c in numeric_cols:
            if c in df.columns:
                df[c] = pd.to_numeric(df[c], errors='coerce').fillna(0)
        df['is_above_vwap'] = df['vwap_dist_pct'] >= 0
    return df

# --- Sidebar Controls ---
st.sidebar.title("🏰 AoE2 War Room")
available_dates = get_available_dates()

selected_date = st.sidebar.selectbox("📅 Select Trading Session", available_dates, index=len(available_dates)-4 if len(available_dates)>=4 else 0)
scouting_time = st.sidebar.selectbox("⏱️ Scouting Window Snapshot", ["09:30:00", "09:20:00", "09:45:00", "10:00:00"], index=0)

st.sidebar.markdown("---")
st.sidebar.info("""
**Morning Build Order Protocol**:
1. **09:15 Gap Scout**: Opening jump vs Y-close.
2. **09:30 War Economy**: 15m RVOL institutional mining.
3. **VWAP High Ground**: Hill control verification.
4. **Sector Battalion Radar**: Clan-level synchronized charges.
""")

df = load_morning_scout_data(selected_date, scouting_time)

if df.empty:
    st.error(f"No market candle data found for {selected_date}!")
    st.stop()

# Header Metrics
st.title(f"🛡️ Intraday War Room: {selected_date} @ {scouting_time}")
st.caption("Empirical 210-Civ Radar Data before Antigravity Stock Selection")

total_civs = len(df)
above_vwap_cnt = int(df['is_above_vwap'].sum())
weather_pct = round((above_vwap_cnt / total_civs) * 100, 1)
godzilla_vol_cnt = len(df[df['rvol'] >= 10.0])
heavy_vol_cnt = len(df[(df['rvol'] >= 4.0) & (df['rvol'] < 10.0)])
top_gainer = df.sort_values(by='move_pct', ascending=False).iloc[0]
top_loser = df.sort_values(by='move_pct', ascending=True).iloc[0]

c1, c2, c3, c4 = st.columns(4)
with c1:
    st.metric("🌦️ Realm Map Weather", f"{weather_pct}% Above VWAP", f"{above_vwap_cnt} / {total_civs} Civs")
with c2:
    st.metric("🐉 Godzilla Rushes (>10x)", f"{godzilla_vol_cnt} Civs", f"+ {heavy_vol_cnt} Heavy (4-10x)")
with c3:
    st.metric("🏹 Feudal Gainer Leader", f"{top_gainer['symbol']}", f"+{top_gainer['move_pct']}% (RVOL {top_gainer['rvol']}x)")
with c4:
    st.metric("💣 Feudal Loser Leader", f"{top_loser['symbol']}", f"{top_loser['move_pct']}% (RVOL {top_loser['rvol']}x)")

st.markdown("---")

tab_radar, tab_sectors, tab_godzilla, tab_truth = st.tabs([
    "🏰 09:30 Feudal Scouting Radar", 
    "🛡️ Sector Battalion Formations", 
    "🐉 Godzilla RVOL & Breakouts", 
    "🏆 15:15 PM EOD Ground Truth"
])

with tab_radar:
    col_filter1, col_filter2, col_filter3 = st.columns(3)
    with col_filter1:
        selected_sector = st.selectbox("Filter Sector", ["ALL"] + sorted(list(df['sector'].unique())))
    with col_filter2:
        min_rvol = st.slider("Min RVOL (Volume Multiplier)", 0.0, 30.0, 0.0, 0.5)
    with col_filter3:
        vwap_filter = st.radio("VWAP Position", ["All", "Above VWAP (Bulls)", "Below VWAP (Bears)"], horizontal=True)

    filtered_df = df.copy()
    if selected_sector != "ALL":
        filtered_df = filtered_df[filtered_df['sector'] == selected_sector]
    if min_rvol > 0:
        filtered_df = filtered_df[filtered_df['rvol'] >= min_rvol]
    if vwap_filter == "Above VWAP (Bulls)":
        filtered_df = filtered_df[filtered_df['is_above_vwap'] == True]
    elif vwap_filter == "Below VWAP (Bears)":
        filtered_df = filtered_df[filtered_df['is_above_vwap'] == False]

    plot_df = filtered_df.copy()
    plot_df['current_vol'] = pd.to_numeric(plot_df['current_vol'], errors='coerce').fillna(1.0).astype(float)
    plot_df['move_pct'] = pd.to_numeric(plot_df['move_pct'], errors='coerce').fillna(0.0).astype(float)
    plot_df['rvol'] = pd.to_numeric(plot_df['rvol'], errors='coerce').fillna(0.0).astype(float)

    fig_scatter = px.scatter(
        plot_df,
        x="move_pct",
        y="rvol",
        size="current_vol",
        size_max=35,
        color="sector",
        hover_name="symbol",
        hover_data=["gap_pct", "clv", "vwap_dist_pct"],
        text="symbol",
        title="09:30 AM RVOL vs Morning Move % (Size = Volume)",
        labels={"move_pct": "Morning Move (%) vs Prev Close", "rvol": "RVOL (Volume Multiplier)"},
        template="plotly_dark",
        height=550
    )
    fig_scatter.update_traces(textposition='top center')
    fig_scatter.add_vline(x=0, line_dash="dash", line_color="gray")
    fig_scatter.add_hline(y=4.0, line_dash="dot", line_color="yellow", annotation_text="Heavy Volume (4x)")
    fig_scatter.add_hline(y=10.0, line_dash="dot", line_color="red", annotation_text="Godzilla Volume (10x)")
    st.plotly_chart(fig_scatter, use_container_width=True)

    st.dataframe(
        filtered_df[['symbol', 'sector', 'gap_pct', 'move_pct', 'rvol', 'clv', 'vwap_dist_pct', 'current_price']].sort_values(by='rvol', ascending=False),
        use_container_width=True,
        hide_index=True
    )

with tab_sectors:
    sector_summary = df.groupby('sector').agg(
        civ_count=('symbol', 'count'),
        avg_move=('move_pct', 'mean'),
        avg_rvol=('rvol', 'mean'),
        above_vwap_count=('is_above_vwap', 'sum')
    ).reset_index()

    sector_summary['pct_above_vwap'] = (sector_summary['above_vwap_count'] / sector_summary['civ_count'] * 100).round(1)
    sector_summary['avg_move'] = sector_summary['avg_move'].round(2)
    sector_summary['avg_rvol'] = sector_summary['avg_rvol'].round(2)
    sector_summary = sector_summary.sort_values(by='avg_move', ascending=False)

    col_s1, col_s2 = st.columns([3, 2])
    with col_s1:
        fig_bar = px.bar(
            sector_summary,
            x="sector",
            y="avg_move",
            color="avg_move",
            color_continuous_scale="RdYlGn",
            title="Sector Average Return (%) at 09:30 AM",
            labels={"avg_move": "Avg Move (%)", "sector": "Sector"},
            template="plotly_dark",
            height=450
        )
        st.plotly_chart(fig_bar, use_container_width=True)

    with col_s2:
        st.markdown("### 📋 Sector Strength Ranking")
        st.dataframe(
            sector_summary[['sector', 'civ_count', 'avg_move', 'avg_rvol', 'pct_above_vwap']],
            use_container_width=True,
            hide_index=True
        )

with tab_godzilla:
    godzilla_df = df[df['rvol'] >= 3.5].sort_values(by='rvol', ascending=False)
    if godzilla_df.empty:
        st.warning("No extreme RVOL outliers (>3.5x) detected in this morning's session.")
    else:
        st.markdown(f"Found **{len(godzilla_df)} High-Mana Outliers** with heavy institutional commitment:")
        st.dataframe(
            godzilla_df[['symbol', 'sector', 'gap_pct', 'move_pct', 'rvol', 'clv', 'vwap_dist_pct']],
            use_container_width=True,
            hide_index=True
        )

with tab_truth:
    col_t1, col_t2 = st.columns(2)
    with col_t1:
        st.markdown("### 🥇 Top 10 Full-Day Game MVPs (Gainers)")
        st.dataframe(
            df.sort_values(by='full_day_pct', ascending=False).head(10)[['symbol', 'sector', 'move_pct', 'rvol', 'post_scout_return_pct', 'full_day_pct', 'max_mfe_long_pct']],
            use_container_width=True,
            hide_index=True
        )
    with col_t2:
        st.markdown("### 💣 Top 10 Annihilated Bases (Losers)")
        st.dataframe(
            df.sort_values(by='full_day_pct', ascending=True).head(10)[['symbol', 'sector', 'move_pct', 'rvol', 'post_scout_return_pct', 'full_day_pct', 'max_mfe_short_pct']],
            use_container_width=True,
            hide_index=True
        )
