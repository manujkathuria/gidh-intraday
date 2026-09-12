# Age of Empires II: Intraday 2v2 Co-op Campaign Contract

## 🏰 The Setup: 2v2 Ranked Lobby (Black Forest / Arabia)
- **Commander 1 (User)**: **Franks / Huns Cavalry Warlord** (Aggressive rushes, front-line instinct, hard risk management).
- **Commander 2 (Antigravity)**: **Byzantines / Saracens Grand Strategist** (Map awareness, counter-unit calculation, fog-of-war divination).

We spawn on a giant 210-player map (the Indian Equity F&O realm) with **Fog of War enabled**. We start at Dark Age 09:00 AM with zero preconceptions. Our mission: Scout the enemy civs, identify who is committing a massive 15x-20x all-in rush, counter weak un-walled economies, coordinate flank assaults, and review the post-game Military Graph at 15:15 PM EOD.

---

## 🗺️ The 3-Phase Match Protocol

### Phase 1: Scout Cavalry & Opening Rushes (09:15 – 09:30 AM)
1. **09:15 AM Opening Tick & Gap Scout** (`market.cash_candles_1m` at 09:15):
   - Compare the 09:15 AM `open` price directly against yesterday's 15:29 PM `close` across all 210 stocks. Who is gapping over walls (> +1.5%)? Who is breached (< -1.5%)?
2. **09:30 AM Feudal / Fast-Castle Scouting** (15-Minute Drive):
   - **RVOL War Economy**: Who is mining 10x–20x normal gold (Godzilla relative volume vs 20-day 15m average)?
   - **VWAP Frontline**: Who controls the center hills (price holding above VWAP)? Is the broad realm weather an allied advance or are 70%+ of civs getting pushed back?
   - **CLV Precision**: Are buyers absorbing the top of the range (CLV > 0.80) or dumping to the floor (CLV < 0.15)?
   - **🏰 Sector Battalion Radar (New!)**: Group all 210 stocks by industry/sector to detect coordinated clan charges (e.g. IT avg +1.43%, Auto avg +1.07%) vs failing sectors (Insurance avg -0.69%).
3. **Target Selection (4 to 6 Bounties / Battlefronts)**:
   - *"Which enemy civ is executing a massive unstoppable Paladin charge (`DIXON`, `BIOCON`, `JIOFIN`)?"*
   - *"Which enemy base just lost their front gate with zero spearman defense (`PATANJALI`, `ICICIGI`, `POLYCAB`)?"*
   - *"Which sibling civs are marching side-by-side in top-ranking sectors (`TECHM` + `INFY` in IT, `ABB` + `SIEMENS` in Cap Goods)?"*

### Phase 2: The Post-Game Timeline & Military Graph (15:15 PM EOD)
At match end (15:15 PM), we bring up the full post-game analytics:
- **Top 10 High-Score Champions (Gainers +4% to +10%)**: Did our scout identify them early?
- **Top 10 Annihilated Bases (Losers -4% to -15%)**: Did we raid the weakest walls?
- **Our Battle PnL & Efficiency**: What was our conversion rate and max favorable expansion?

### Phase 3: The Command Codex (`SELECTION_PLAYBOOK.md`)
We record battle tactics and civ synergies into our shared Playbook and database (`ai.selection_*`):
- What subtle scout cues predicted the mid-game power spikes?
- Upgrade our build orders for the next ranked ladder match!

---

## 🛡️ Lobby Rules
1. **Zero External Magicka / API Calls**: Local Antigravity engine + PostgreSQL TimescaleDB only.
2. **Total Map Visibility**: All 210 civs are scouted equally.
3. **Pure Empirical Meta**: We play the map in front of us, adapting to reality with zero rigid dogma.


