import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    """
    Returns a connection to TimescaleDB.
    Defaults to local 127.0.0.1:5432 or environment config.
    """
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=os.getenv("DB_PORT", "5432"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "P@ssw0rd"),
        dbname=os.getenv("DB_NAME", "gidh_intraday")
    )

# Capital & Sizing Defaults
DEFAULT_TRADE_CAPITAL = 50000.0   # ₹10,000 margin * 5x MIS leverage
DEFAULT_MARGIN_PER_SLOT = 10000.0
DEFAULT_ROUND_TRIP_FRICTION = 70.0  # Brokerage + STT + exchange turnover fees per ₹50k round trip
MAX_CONCURRENT_SLOTS = 4
