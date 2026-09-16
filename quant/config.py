import os
import psycopg2

DB_URL = os.getenv("DATABASE_URL", "postgres://postgres:P%40ssw0rd@127.0.0.1:5432/gidh_intraday?sslmode=disable")

def get_connection():
    return psycopg2.connect(DB_URL)
