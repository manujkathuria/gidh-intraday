from __future__ import annotations

from typing import Any, Protocol


class ResearchModel(Protocol):
    model: str
    def json(self, task: str, payload: dict[str, Any]) -> dict[str, Any]: ...


def analyse(outcomes: list[dict[str, object]], model: ResearchModel) -> dict[str, object]:
    correct = sum(float(row["directional_return_pct"]) > 0 for row in outcomes)
    output = model.json(
        "Write one concise immutable EOD learning from these objective outcomes. Return JSON {learning:string, discovery_proposals:[{rule:string,stance:string,reason:string}]}. "
        "Do not claim an edge. Proposals are candidates only; do not promote rules.",
        {"metric": "09:30_to_close_directional_return_pct", "correct": correct, "total": len(outcomes), "outcomes": outcomes},
    )
    learning = str(output.get("learning", "")).strip()
    if not learning:
        raise ValueError("Gemini must return a non-empty learning")
    proposals = output.get("discovery_proposals", [])
    if not isinstance(proposals, list):
        raise ValueError("discovery_proposals must be a list")
    return {"primary_metric": "09:30_to_close_directional_return_pct", "selection_result": f"directionally correct on {correct} of {len(outcomes)} candidates", "learning": learning, "discovery_proposals": proposals, "human_execution_excluded": True}
