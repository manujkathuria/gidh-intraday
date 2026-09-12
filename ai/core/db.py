import psycopg2
from psycopg2.extensions import connection
from ai.core.config import DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME

def get_db_connection() -> connection:
    """Returns a direct psycopg2 connection to TimescaleDB."""
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        dbname=DB_NAME
    )
