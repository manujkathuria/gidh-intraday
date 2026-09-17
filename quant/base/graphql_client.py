"""
🏛️ GIDH QUANT: HIGH-PERFORMANCE GRAPHQL CLIENT FOR EDGE SERVICE
Allows python quant algorithms, scanners, and trackers to query the edge service directly.
"""

import os
import requests
from typing import Dict, Any, Optional, List

class EdgeGraphQLClient:
    def __init__(self, endpoint: Optional[str] = None):
        self.endpoint = endpoint or os.getenv("EDGE_GRAPHQL_URL", "http://127.0.0.1:8080/graphql")

    def execute(self, query: str, variables: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Executes a GraphQL query against the edge service.
        """
        payload = {"query": query, "variables": variables or {}}
        res = requests.post(self.endpoint, json=payload, timeout=10)
        res.raise_for_status()
        json_data = res.json()
        if "errors" in json_data and json_data["errors"]:
            raise RuntimeError(f"GraphQL Error: {json_data['errors'][0].get('message')}")
        return json_data.get("data", {})

    def get_futures_inflow(
        self,
        date: str,
        min_price: float = 300.0,
        max_price: float = 7000.0,
        min_inflow: float = 40.0,
        min_oi_pct: float = 3.5,
    ) -> List[Dict[str, Any]]:
        """
        Fetches filtered macro futures inflow data with selective fields.
        """
        query = """
        query GetFuturesInflow($date: String, $minPrice: Float, $maxPrice: Float, $minInflow: Float, $minOiPct: Float) {
          futuresInflow(date: $date, minPrice: $minPrice, maxPrice: $maxPrice, minInflow: $minInflow, minOiPct: $minOiPct) {
            sessionDate
            totalCount
            data {
              symbol
              tradingSymbol
              futClose
              prevClose
              futOi
              price1dPct
              oi1dPct
              freshInflow1dCr
              freshInflow3dCr
              totalNotionalCr
            }
          }
        }
        """
        variables = {
            "date": date,
            "minPrice": min_price,
            "maxPrice": max_price,
            "minInflow": min_inflow,
            "minOiPct": min_oi_pct,
        }
        data = self.execute(query, variables)
        return data.get("futuresInflow", {}).get("data", [])

    def get_sessions(self) -> List[Dict[str, Any]]:
        """
        Fetches published trading sessions.
        """
        query = """
        query GetSessions {
          sessions {
            date
            featureVersion
          }
        }
        """
        data = self.execute(query)
        return data.get("sessions", [])
