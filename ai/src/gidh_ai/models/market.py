from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Any


@dataclass(frozen=True)
class PublishedSession:
    date: date
    feature_run_id: str
    feature_version: str
    published_at: datetime

    @classmethod
    def from_api(cls, value: dict[str, Any]) -> "PublishedSession":
        return cls(date.fromisoformat(value["date"]), value["feature_run_id"], value["feature_version"], datetime.fromisoformat(value["published_at"]))


@dataclass(frozen=True)
class DailyFeature:
    symbol: str
    prior_close: float
    cpr_pivot: float
    atr_14: float
    adr_20: float
    return_5d_pct: float
    return_20d_pct: float
    volume_dryup_ratio: float

    @classmethod
    def from_api(cls, value: dict[str, Any]) -> "DailyFeature":
        return cls(**{field: value[field] for field in cls.__dataclass_fields__})


@dataclass(frozen=True)
class IntradayFeature:
    timestamp: datetime
    cash_close: float
    session_vwap: float | None
    vwap_distance_sigma: float | None
    relative_volume: float | None
    session_range_pct_atr: float | None
    adr_fuel_used_pct: float | None
    futures_basis_pct: float | None
    cash_is_complete: bool
    future_is_complete: bool

    @classmethod
    def from_api(cls, value: dict[str, Any]) -> "IntradayFeature":
        fields = {field: value[field] for field in cls.__dataclass_fields__}
        fields["timestamp"] = datetime.fromisoformat(fields["timestamp"])
        return cls(**fields)
