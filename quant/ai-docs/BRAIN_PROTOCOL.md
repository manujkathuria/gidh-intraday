# 🧠 GIDH BRAIN PROTOCOL & DEVELOPER GUIDE

> **Rule for AI Agents**: Every new brain added to `quant/brains/` MUST inherit from `BaseBrain` in [`quant/brains/base_brain.py`](file:///Users/manujkathuria/workspace/gidh/gidh-intraday/quant/brains/base_brain.py) and use typed dataclasses from `types.py`.

---

## 1. The `BaseBrain` Contract

Every brain implements the same typed lifecycle and 3 operations:

```python
from abc import ABC, abstractmethod
from typing import Generic, TypeVar, Union, Dict, Any
from quant.base.db import get_db_connection

TSensory = TypeVar("TSensory")
TDecision = TypeVar("TDecision")
TOutcome = TypeVar("TOutcome")
TMemory = TypeVar("TMemory")

class BaseBrain(Generic[TSensory, TDecision, TOutcome, TMemory], ABC):
    def __init__(self, brain_id: str):
        self.brain_id = brain_id

    @abstractmethod
    def build_sensory_packet(self, session_date: str, conn=None) -> TSensory:
        """
        Gathers raw measurements from this brain's dedicated sensory tools.
        Must return pure unadulterated sensory structure for AI reasoning.
        """
        pass

    def record_decision(self, session_date: str, decisions: Union[TDecision, dict], sensory_features: Union[TSensory, dict], ai_thesis: str, conn=None):
        """Universal persistence to quant.brain_sessions with JSONB sanitization"""
        ...

    def record_eod_forensics(self, session_date: str, outcomes_payload: Union[TOutcome, dict], forensics_summary: str, conn=None):
        """Universal persistence for EOD review & syncs quant.brain_memory"""
        ...

    def get_rolling_memory(self, conn=None) -> dict:
        """Loads persistent rolling memory for this brain"""
        ...
```

---

## 2. Step-by-Step: How to Build a New Brain

When constructing any new trading brain (e.g., `micro_vwap`, `micro_orb`, `risk_governor`):

### Step 1: Create the Brain Folder & Typed Schemas
```
quant/brains/micro_vwap/
├── tools/
│   ├── vwap_sensor.py      # Extracts raw 1-min VWAP distances & volume profile
│   └── execution_sensor.py # Measures live order fills & slippage
├── types.py                # Typed dataclasses (VwapSensoryPacket, VwapTradeDecisions, etc.)
├── dispatcher.py           # Inherits from BaseBrain[VwapSensoryPacket, ...]
└── runner.py               # CLI tool for recording executions and EOD post-market review
```

### Step 2: Implement `dispatcher.py`
```python
from quant.brains.base_brain import BaseBrain
from quant.brains.micro_vwap.types import VwapSensoryPacket, VwapTradeDecisions, VwapOutcomes, VwapMemoryState
from quant.brains.micro_vwap.tools.vwap_sensor import extract_vwap_state

class MicroVwapBrain(BaseBrain[VwapSensoryPacket, VwapTradeDecisions, VwapOutcomes, VwapMemoryState]):
    def __init__(self):
        super().__init__(brain_id="micro_vwap")

    def build_sensory_packet(self, session_date: str, conn=None) -> VwapSensoryPacket:
        raw_vwap = extract_vwap_state(session_date, conn=conn)
        rolling_mem = self.get_rolling_memory(conn=conn)
        return VwapSensoryPacket(
            session_date=session_date,
            brain_id=self.brain_id,
            rolling_memory=rolling_mem,
            orderflow=raw_vwap
        )
```

### Step 3: Register in `quant/towncenter.py`
Add the subcommand to `towncenter.py` so the brain can be inspected and run via CLI.

---

## 3. Invariants & Rules

1. **No Heuristic Code in Tools**: Tools only query TimescaleDB and format metrics. They never decide buy/sell or filter based on arbitrary rules.
2. **Pure JSONB Persistence**: Never create new database tables for new brains. All brains write to `quant.brain_sessions` and `quant.brain_memory`.
3. **Continuous Evolutionary Memory**: Always write an EOD reflection so subsequent sessions benefit from prior trade forensics.
