import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    """
    Returns a connection to the TimescaleDB database.
    Defaults to local 127.0.0.1:5432 or environment config.
    """
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=os.getenv("DB_PORT", "5432"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "P@ssw0rd"),
        dbname=os.getenv("DB_NAME", "gidh_intraday")
    )

TRADE_CAPITAL_DEFAULT = 50000.0  # ₹10,000 margin * 5x leverage
ROUND_TRIP_FRICTION_DEFAULT = 70.0  # Approx ₹70 brokerage + STT + taxes per ₹50k round trip
