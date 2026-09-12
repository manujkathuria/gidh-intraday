import os
from dotenv import load_dotenv

load_dotenv()

# Database Config
DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASSWORD", "P@ssw0rd")
DB_NAME = os.getenv("DB_NAME", "gidh_intraday")

# Market Timing Constants (IST)
MARKET_OPEN_TIME = "09:15:00"
FEUDAL_SCOUT_TIME = "09:30:00"
OR30_TIME = "09:45:00"
EOD_CLOSE_TIME = "15:15:00"

# Quantitative Baseline Thresholds
GODZILLA_RVOL_THRESHOLD = 10.0
HEAVY_RVOL_THRESHOLD = 4.0
MIN_GAP_THRESHOLD_PCT = 1.2
CLV_BULL_THRESHOLD = 0.75
CLV_BEAR_THRESHOLD = 0.25
