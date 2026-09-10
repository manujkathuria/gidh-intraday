import unittest

from gidh_ai.research.replay_analyst import analyse


class FakeModel:
    model = "fake"
    def json(self, task, payload):
        return {"learning": "Test the hypothesis again.", "discovery_proposals": []}


class ReplayAnalystTest(unittest.TestCase):
    def test_builds_immutable_learning_payload(self):
        result = analyse([{"directional_return_pct": 1.0}, {"directional_return_pct": -1.0}], FakeModel())
        self.assertEqual("directionally correct on 1 of 2 candidates", result["selection_result"])
