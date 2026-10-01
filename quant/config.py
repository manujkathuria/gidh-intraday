import os
from pydantic import BaseModel

class Settings(BaseModel):
    DB_HOST: str = os.getenv("GIDH_DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("GIDH_DB_PORT", "5432"))
    DB_USER: str = os.getenv("GIDH_DB_USER", "postgres")
    DB_PASSWORD: str = os.getenv("GIDH_DB_PASSWORD", "")
    DB_NAME: str = os.getenv("GIDH_DB_NAME", "gidh_intraday")
    
    API_PORT: int = int(os.getenv("QUANT_API_PORT", "8001"))
    MIN_RVOL: float = float(os.getenv("QUANT_MIN_RVOL", "2.5"))

settings = Settings()
