import sys
import os
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import streamlit as st
import pandas as pd
import plotly.graph_objects as px_go

from quant.engine.macro_reversal_scanner import (
    get_all_symbols,
    get_all_dates,
    get_macro_daily_candles,
    get_intraday_data_with_macro_levels
)

# Page configuration
st.set_page_config(
    page_title="Gidh - Multi-Timeframe Chart",
    page_icon="🦅",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.markdown("""
<style>
    .block-container {
        padding-top: 1rem;
        padding-bottom: 0rem;
        padding-left: 1rem;
        padding-right: 1rem;
    }
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    button[title="View fullscreen"] {display: none;}
    [data-testid="stElementToolbar"] {display: none;}
</style>
""", unsafe_allow_html=True)

# -------------------------------------------------------------
# SIDEBAR CONTROLS
# -------------------------------------------------------------
st.sidebar.title("🦅 GIDH VULTURE")
st.sidebar.caption("Multi-Timeframe Macro & Intraday")

# 1. Stock Selector
symbols = get_all_symbols()
if not symbols:
    st.error("No active instruments found in database.")
    st.stop()

default_idx = symbols.index("HEROMOTOCO") if "HEROMOTOCO" in symbols else 0
selected_symbol = st.sidebar.selectbox(
    "🔍 Select Stock",
    options=symbols,
    index=default_idx
)

# 2. Date Selector
dates = get_all_dates()
if not dates:
    st.error("No daily sessions found in database.")
    st.stop()

selected_date = st.sidebar.selectbox(
    "📅 Select Date",
    options=dates,
    index=0
)

# 3. View Mode Toggle
st.sidebar.markdown("---")
view_mode = st.sidebar.radio(
    "⏱️ Timeframe Mode",
    options=["⚡ Intraday (1-Minute + Valid Levels)", "📊 Macro (Daily Structure)"],
    index=0
)

# -------------------------------------------------------------
# VIEW 1: INTRADAY (1-MINUTE + VALID UNVIOLATED MACRO LEVELS)
# -------------------------------------------------------------
if "Intraday" in view_mode:
    df_1m, macro_levels = get_intraday_data_with_macro_levels(selected_symbol, selected_date)
    
    if df_1m.empty:
        st.warning(f"No 1-minute intraday candle data found for {selected_symbol} on {selected_date}.")
        st.stop()
        
    latest_1m = df_1m.iloc[-1]
    open_1m = df_1m.iloc[0]['open']
    day_chg = ((latest_1m['close'] - open_1m) / open_1m) * 100
    
    st.markdown(
        f"<div style='font-size: 14px; font-weight: 600; margin-bottom: 4px; color: #e5e7eb;'>"
        f"⚡ {selected_symbol} &nbsp;|&nbsp; 1-Minute Intraday ({selected_date}) &nbsp;|&nbsp; "
        f"Open: ₹{open_1m:.2f} &nbsp; High: ₹{df_1m['high'].max():.2f} &nbsp; Low: ₹{df_1m['low'].min():.2f} &nbsp; "
        f"Close: ₹{latest_1m['close']:.2f} (<span style='color:{'#22c55e' if day_chg >= 0 else '#ef4444'}'>{day_chg:+.2f}%</span>) &nbsp;|&nbsp; "
        f"PWH: ₹{macro_levels.get('pwh', 0):.2f} &nbsp; PWL: ₹{macro_levels.get('pwl', 0):.2f}"
        f"</div>",
        unsafe_allow_html=True
    )
    
    fig = px_go.Figure()
    
    # 1. 1-Minute Candlesticks
    fig.add_trace(px_go.Candlestick(
        x=df_1m['time_str'],
        open=df_1m['open'],
        high=df_1m['high'],
        low=df_1m['low'],
        close=df_1m['close'],
        name='1m Candles',
        increasing_line_color='#22c55e',
        decreasing_line_color='#ef4444'
    ))
    
    # 2. Intraday Rolling VWAP
    if 'vwap' in df_1m.columns and not df_1m['vwap'].isna().all():
        fig.add_trace(px_go.Scatter(
            x=df_1m['time_str'],
            y=df_1m['vwap'],
            mode='lines',
            line=dict(color='#f59e0b', width=1.5),
            name='Intraday VWAP'
        ))
        
    last_time = df_1m['time_str'].iloc[-1]

    # 3. Macro PWH (Prior Week High)
    if 'pwh' in macro_levels:
        fig.add_trace(px_go.Scatter(
            x=df_1m['time_str'],
            y=[macro_levels['pwh']] * len(df_1m),
            mode='lines',
            line=dict(color='#ef4444', width=2, dash='dash'),
            name=f"PWH (₹{macro_levels['pwh']:.2f})"
        ))
        fig.add_annotation(
            x=last_time, y=macro_levels['pwh'],
            text=f"PWH ₹{macro_levels['pwh']:.2f}",
            showarrow=False,
            xanchor="left",
            font=dict(size=11, color="#f87171"),
            bgcolor="rgba(17,24,39,0.8)"
        )

    # 4. Macro PWL (Prior Week Low)
    if 'pwl' in macro_levels:
        fig.add_trace(px_go.Scatter(
            x=df_1m['time_str'],
            y=[macro_levels['pwl']] * len(df_1m),
            mode='lines',
            line=dict(color='#22c55e', width=2, dash='dash'),
            name=f"PWL (₹{macro_levels['pwl']:.2f})"
        ))
        fig.add_annotation(
            x=last_time, y=macro_levels['pwl'],
            text=f"PWL ₹{macro_levels['pwl']:.2f}",
            showarrow=False,
            xanchor="left",
            font=dict(size=11, color="#34d399"),
            bgcolor="rgba(17,24,39,0.8)"
        )

    # 5. Macro PDH (Prior Day High)
    if 'pdh' in macro_levels:
        fig.add_trace(px_go.Scatter(
            x=df_1m['time_str'],
            y=[macro_levels['pdh']] * len(df_1m),
            mode='lines',
            line=dict(color='#fb923c', width=1.2, dash='dot'),
            name=f"PDH (₹{macro_levels['pdh']:.2f})"
        ))
        fig.add_annotation(
            x=last_time, y=macro_levels['pdh'],
            text=f"PDH ₹{macro_levels['pdh']:.2f}",
            showarrow=False,
            xanchor="left",
            font=dict(size=10, color="#fb923c"),
            bgcolor="rgba(17,24,39,0.8)"
        )

    # 6. Macro PDL (Prior Day Low)
    if 'pdl' in macro_levels:
        fig.add_trace(px_go.Scatter(
            x=df_1m['time_str'],
            y=[macro_levels['pdl']] * len(df_1m),
            mode='lines',
            line=dict(color='#38bdf8', width=1.2, dash='dot'),
            name=f"PDL (₹{macro_levels['pdl']:.2f})"
        ))
        fig.add_annotation(
            x=last_time, y=macro_levels['pdl'],
            text=f"PDL ₹{macro_levels['pdl']:.2f}",
            showarrow=False,
            xanchor="left",
            font=dict(size=10, color="#38bdf8"),
            bgcolor="rgba(17,24,39,0.8)"
        )

    # Level: Nearest Valid Swing Resistance
    if macro_levels.get('swing_res') is not None:
        sr = macro_levels['swing_res']
        fig.add_trace(px_go.Scatter(
            x=df_1m['time_str'],
            y=[sr] * len(df_1m),
            mode='lines',
            line=dict(color='#ef4444', width=2.5, dash='solid'),
            name=f"Swing RES (₹{sr:.2f})"
        ))
        fig.add_annotation(
            x=last_time, y=sr,
            text=f"Swing RES ₹{sr:.2f}",
            showarrow=False,
            xanchor="left",
            font=dict(size=11, color="#f87171"),
            bgcolor="rgba(17,24,39,0.8)"
        )

    # 7. Valid CLV Rejection SUPPLY ZONES (Shaded Red Bands)
    supply_zones = macro_levels.get('clv_supply_zones', [])
    for idx, zone in enumerate(supply_zones):
        z_top = zone['top']
        z_bottom = zone['bottom']
        z_date = zone.get('date', '')
        # Add shaded rectangle
        fig.add_hrect(
            y0=z_bottom, y1=z_top,
            fillcolor="rgba(239, 68, 68, 0.15)",
            line=dict(color="rgba(239, 68, 68, 0.6)", width=1, dash="dash"),
            layer="below"
        )
        fig.add_annotation(
            x=last_time, y=(z_top + z_bottom) / 2,
            text=f"Supply Zone {idx+1} ({z_date})<br>₹{z_bottom:.1f} – ₹{z_top:.1f}",
            showarrow=False,
            xanchor="left",
            font=dict(size=10, color="#fca5a5"),
            bgcolor="rgba(17,24,39,0.85)",
            bordercolor="rgba(239, 68, 68, 0.5)",
            borderwidth=1
        )

    # 8. Valid CLV Defence DEMAND ZONES (Shaded Green Bands)
    demand_zones = macro_levels.get('clv_demand_zones', [])
    for idx, zone in enumerate(demand_zones):
        z_top = zone['top']
        z_bottom = zone['bottom']
        z_date = zone.get('date', '')
        # Add shaded rectangle
        fig.add_hrect(
            y0=z_bottom, y1=z_top,
            fillcolor="rgba(34, 197, 94, 0.15)",
            line=dict(color="rgba(34, 197, 94, 0.6)", width=1, dash="dash"),
            layer="below"
        )
        fig.add_annotation(
            x=last_time, y=(z_top + z_bottom) / 2,
            text=f"Demand Zone {idx+1} ({z_date})<br>₹{z_bottom:.1f} – ₹{z_top:.1f}",
            showarrow=False,
            xanchor="left",
            font=dict(size=10, color="#86efac"),
            bgcolor="rgba(17,24,39,0.85)",
            bordercolor="rgba(34, 197, 94, 0.5)",
            borderwidth=1
        )

    # Level: Nearest Valid Swing Support
    if macro_levels.get('swing_sup') is not None:
        ss = macro_levels['swing_sup']
        fig.add_trace(px_go.Scatter(
            x=df_1m['time_str'],
            y=[ss] * len(df_1m),
            mode='lines',
            line=dict(color='#22c55e', width=2.5, dash='solid'),
            name=f"Swing SUP (₹{ss:.2f})"
        ))
        fig.add_annotation(
            x=last_time, y=ss,
            text=f"Swing SUP ₹{ss:.2f}",
            showarrow=False,
            xanchor="left",
            font=dict(size=11, color="#34d399"),
            bgcolor="rgba(17,24,39,0.8)"
        )

    # Clean spaced ticks (every 30 mins: 09:15, 09:45, 10:15...)
    tick_indices = list(range(0, len(df_1m), 30))
    if (len(df_1m) - 1) not in tick_indices:
        tick_indices.append(len(df_1m) - 1)
    tick_vals = [df_1m['time_str'].iloc[i] for i in tick_indices]

    fig.update_layout(
        height=660,
        template='plotly_dark',
        xaxis_rangeslider_visible=False,
        xaxis=dict(
            type='category',
            tickmode='array',
            tickvals=tick_vals,
            ticktext=tick_vals
        ),
        margin=dict(l=25, r=25, t=10, b=40),
        legend=dict(
            orientation="h",
            yanchor="top",
            y=-0.12,
            xanchor="center",
            x=0.5
        )
    )

    st.plotly_chart(fig, use_container_width=True, config={'displayModeBar': False, 'staticPlot': False})

# -------------------------------------------------------------
# VIEW 2: MACRO (DAILY STRUCTURE)
# -------------------------------------------------------------
else:
    lookback = st.sidebar.slider("Lookback Sessions", min_value=20, max_value=200, value=120, step=10)
    daily_df = get_macro_daily_candles(selected_symbol, selected_date, limit=lookback)

    if daily_df.empty:
        st.warning(f"No daily candle data found for {selected_symbol} up to {selected_date}.")
        st.stop()

    latest_bar = daily_df.iloc[-1]
    chg = ((latest_bar['close'] - latest_bar['open']) / latest_bar['open']) * 100
    clv_val = latest_bar.get('clv', 0.0)

    st.markdown(
        f"<div style='font-size: 14px; font-weight: 600; margin-bottom: 4px; color: #e5e7eb;'>"
        f"📊 {selected_symbol} &nbsp;|&nbsp; Daily Macro ({selected_date}) &nbsp;|&nbsp; "
        f"O: ₹{latest_bar['open']:.2f} &nbsp; H: ₹{latest_bar['high']:.2f} &nbsp; L: ₹{latest_bar['low']:.2f} &nbsp; "
        f"C: ₹{latest_bar['close']:.2f} (<span style='color:{'#22c55e' if chg >= 0 else '#ef4444'}'>{chg:+.2f}%</span>) &nbsp;|&nbsp; "
        f"Vol: {int(latest_bar['volume']):,} &nbsp;|&nbsp; "
        f"CLV: <span style='color:{'#22c55e' if clv_val >= 0.6 else ('#ef4444' if clv_val <= -0.6 else '#9ca3af')}'>{clv_val:+.2f}</span>"
        f"</div>",
        unsafe_allow_html=True
    )

    fig = px_go.Figure()

    # 1. Daily Candlesticks
    fig.add_trace(px_go.Candlestick(
        x=daily_df['date'].astype(str),
        open=daily_df['open'],
        high=daily_df['high'],
        low=daily_df['low'],
        close=daily_df['close'],
        name='Daily Price',
        increasing_line_color='#22c55e',
        decreasing_line_color='#ef4444'
    ))

    # 2. Prior Week High (PWH)
    if 'pwh' in daily_df.columns and not daily_df['pwh'].isna().all():
        fig.add_trace(px_go.Scatter(
            x=daily_df['date'].astype(str),
            y=daily_df['pwh'],
            mode='lines',
            line=dict(color='#f87171', width=1.5, dash='dash'),
            name='PWH (Prior Week High)'
        ))

    # 3. Prior Week Low (PWL)
    if 'pwl' in daily_df.columns and not daily_df['pwl'].isna().all():
        fig.add_trace(px_go.Scatter(
            x=daily_df['date'].astype(str),
            y=daily_df['pwl'],
            mode='lines',
            line=dict(color='#34d399', width=1.5, dash='dash'),
            name='PWL (Prior Week Low)'
        ))

    # 4. Structural Swings (HH, LH, HL, LL)
    if 'swing_high' in daily_df.columns:
        swing_highs = daily_df[daily_df['swing_high'].notna()].copy()
        if not swing_highs.empty:
            fig.add_trace(px_go.Scatter(
                x=swing_highs['date'].astype(str),
                y=swing_highs['swing_high'],
                mode='markers+text',
                marker=dict(symbol='triangle-down', size=11, color='#ef4444'),
                text=swing_highs['swing_label'],
                textposition='top center',
                textfont=dict(size=11, color='#fca5a5', family='Arial Black'),
                name='Swing High (HH/LH)',
                hoverinfo='text',
                hovertext=[f"{lbl}: ₹{h:.2f}" for lbl, h in zip(swing_highs['swing_label'], swing_highs['swing_high'])]
            ))

    if 'swing_low' in daily_df.columns:
        swing_lows = daily_df[daily_df['swing_low'].notna()].copy()
        if not swing_lows.empty:
            fig.add_trace(px_go.Scatter(
                x=swing_lows['date'].astype(str),
                y=swing_lows['swing_low'],
                mode='markers+text',
                marker=dict(symbol='triangle-up', size=11, color='#22c55e'),
                text=swing_lows['swing_label'],
                textposition='bottom center',
                textfont=dict(size=11, color='#86efac', family='Arial Black'),
                name='Swing Low (HL/LL)',
                hoverinfo='text',
                hovertext=[f"{lbl}: ₹{l:.2f}" for lbl, l in zip(swing_lows['swing_label'], swing_lows['swing_low'])]
            ))

    # 5. CLV Highlight Dots
    if 'clv' in daily_df.columns:
        bear_rejection = daily_df[daily_df['clv'] <= -0.60].copy()
        if not bear_rejection.empty:
            fig.add_trace(px_go.Scatter(
                x=bear_rejection['date'].astype(str),
                y=bear_rejection['high'] * 1.004,
                mode='markers',
                marker=dict(symbol='circle', size=6, color='#ef4444'),
                name='🔴 Supply Rejection (CLV ≤ -0.60)',
                hoverinfo='text',
                hovertext=[f"CLV: {c:.2f} (Closed at Lows)" for c in bear_rejection['clv']]
            ))

        bull_defence = daily_df[daily_df['clv'] >= 0.60].copy()
        if not bull_defence.empty:
            fig.add_trace(px_go.Scatter(
                x=bull_defence['date'].astype(str),
                y=bull_defence['low'] * 0.996,
                mode='markers',
                marker=dict(symbol='circle', size=6, color='#22c55e'),
                name='🟢 Demand Defence (CLV ≥ +0.60)',
                hoverinfo='text',
                hovertext=[f"CLV: +{c:.2f} (Closed at Highs)" for c in bull_defence['clv']]
            ))

    num_dates = len(daily_df)
    step = max(1, num_dates // 10)
    tick_indices = list(range(0, num_dates, step))
    if (num_dates - 1) not in tick_indices:
        tick_indices.append(num_dates - 1)
    tick_vals = [daily_df['date'].astype(str).iloc[i] for i in tick_indices]

    fig.update_layout(
        height=660,
        template='plotly_dark',
        xaxis_rangeslider_visible=False,
        xaxis=dict(
            type='category',
            tickmode='array',
            tickvals=tick_vals,
            ticktext=tick_vals,
            tickangle=-30
        ),
        margin=dict(l=25, r=25, t=10, b=40),
        legend=dict(
            orientation="h",
            yanchor="top",
            y=-0.12,
            xanchor="center",
            x=0.5
        )
    )

    st.plotly_chart(fig, use_container_width=True, config={'displayModeBar': False, 'staticPlot': False})
