import { DocArticle } from "./types";

export const QUANT_PROTOCOL_DOC: DocArticle = {
  id: "quant-brain-protocol",
  title: "The BaseBrain Contract & Developer Guide",
  shortTitle: "BaseBrain Contract",
  description: "Specification for implementing new trading brains in 3 simple steps under quant/brains/.",
  category: "quant",
  readTime: "3 min read",
  content: `
# The BaseBrain Contract & Developer Guide

Every trading brain (Macro Selector, Micro VWAP, Micro ORB, Pullback Defense, Risk Governor) inherits from \`BaseBrain\` in \`quant/brains/base_brain.py\`.

---

## 1. Brain Implementation Protocol

\`\`\`mermaid
flowchart TD
    subgraph Step1 [Step 1: Create Directory & Types]
        D1["quant/brains/micro_name/<br/>├── tools/<br/>│   ├── custom_sensor.py<br/>│   └── review_sensor.py<br/>├── types.py<br/>├── dispatcher.py<br/>└── runner.py"]
    end

    subgraph Step2 [Step 2: Implement BaseBrain]
        C1["class CustomBrain(BaseBrain[TSensory, TDecision, TOutcome, TMemory]):<br/>• __init__('micro_name')<br/>• build_sensory_packet()<br/>• Inherits .record_decision()<br/>• Inherits .record_eod_forensics()"]
    end

    subgraph Step3 [Step 3: Register in Towncenter]
        T1["towncenter.py<br/>Add CLI subcommand"]
    end

    Step1 --> Step2
    Step2 --> Step3
\`\`\`

---

## 2. Generic Typed BaseBrain Contract

\`\`\`python
from abc import ABC, abstractmethod
from typing import Generic, TypeVar, Union, Dict, Any

TSensory = TypeVar("TSensory")
TDecision = TypeVar("TDecision")
TOutcome = TypeVar("TOutcome")
TMemory = TypeVar("TMemory")

class BaseBrain(Generic[TSensory, TDecision, TOutcome, TMemory], ABC):
    def __init__(self, brain_id: str):
        self.brain_id = brain_id

    @abstractmethod
    def build_sensory_packet(self, session_date: str, conn=None) -> TSensory:
        """Extracts raw tool measurements. Zero heuristic rules."""
        pass

    def record_decision(self, session_date: str, decisions: Union[TDecision, dict], sensory_features: Union[TSensory, dict], ai_thesis: str, conn=None):
        """Universal persistence to quant.brain_sessions with JSONB sanitization"""
        ...

    def record_eod_forensics(self, session_date: str, outcomes_payload: Union[TOutcome, dict], forensics_summary: str, conn=None):
        """Universal persistence for EOD review & syncs quant.brain_memory"""
        ...
\`\`\`

---

## 3. Building a New Brain in 3 Steps

### Step 1: Create the Brain Directory & Typed Schemas
\`\`\`text
quant/brains/micro_vwap/
├── tools/
│   ├── vwap_sensor.py      # Raw 1-min VWAP distances & volume profile
│   └── execution_sensor.py # Fill & slippage metrics
├── types.py                # Typed dataclasses (VwapSensoryPacket, VwapTradeDecisions, etc.)
├── dispatcher.py           # Inherits from BaseBrain[VwapSensoryPacket, ...]
└── runner.py               # CLI tool for recording executions and EOD post-market review
\`\`\`

### Step 2: Implement \`dispatcher.py\`
\`\`\`python
from quant.brains.base_brain import BaseBrain
from quant.brains.micro_vwap.types import VwapSensoryPacket, VwapTradeDecisions, VwapOutcomes, VwapMemoryState
from quant.brains.micro_vwap.tools.vwap_sensor import extract_vwap_state

class MicroVwapBrain(BaseBrain[VwapSensoryPacket, VwapTradeDecisions, VwapOutcomes, VwapMemoryState]):
    def __init__(self):
        super().__init__(brain_id="micro_vwap")

    def build_sensory_packet(self, session_date: str, conn=None) -> VwapSensoryPacket:
        return VwapSensoryPacket(
            session_date=session_date,
            brain_id=self.brain_id,
            rolling_memory=self.get_rolling_memory(conn=conn),
            vwap_state=extract_vwap_state(session_date, conn=conn)
        )
\`\`\`
`
};
