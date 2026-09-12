from dataclasses import dataclass
from abc import ABC, abstractmethod
from typing import List
import pandas as pd

@dataclass
class AlphaSignal:
    symbol: str
    sector: str
    signal_name: str
    direction: str  # "BULLISH" | "BEARISH" | "AVOID"
    confidence: str # "HIGH" | "MEDIUM" | "LOW"
    rationale: str
    move_pct: float
    gap_pct: float
    rvol: float
    clv: float

class BaseClassifier(ABC):
    @abstractmethod
    def classify(self, df: pd.DataFrame, **kwargs) -> List[AlphaSignal]:
        """Evaluates DataFrame of market features and outputs labeled AlphaSignals."""
        pass
