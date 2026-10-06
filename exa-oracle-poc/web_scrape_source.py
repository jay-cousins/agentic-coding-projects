"""
Oracle data source (a): structured datapoints scraped from official web pages.

Wraps Exa's /search with outputSchema so a query against an authoritative
domain returns a grounded, structured datapoint instead of raw text.
"""

import json
import os
from dataclasses import asdict, is_dataclass
from datetime import datetime, timezone
from typing import Any

from dotenv import load_dotenv
from exa_py import Exa

load_dotenv()

OUTPUT_PATH = "oracle_output.jsonl"


def get_client() -> Exa:
    api_key = os.environ.get("EXA_API_KEY")
    if not api_key:
        raise RuntimeError("EXA_API_KEY not set (see .env.example)")
    return Exa(api_key=api_key)


def fetch_datapoint(
    query: str,
    output_schema: dict[str, Any],
    system_prompt: str,
    include_domains: list[str],
    max_age_hours: int = 1,
) -> dict[str, Any]:
    """Fetch one structured, source-grounded datapoint from official domains."""
    exa = get_client()
    results = exa.search(
        query,
        type="neural",
        system_prompt=system_prompt,
        output_schema=output_schema,
        include_domains=include_domains,
        contents={"highlights": True, "max_age_hours": max_age_hours},
    )
    return {
        "datapoint": results.output.content,
        "grounding": [
            asdict(g) if is_dataclass(g) else g for g in results.output.grounding
        ],
    }


US_OPEN_SCHEMA = {
    "type": "object",
    "required": ["event", "winner", "score"],
    "properties": {
        "event": {"type": "string", "description": "Name of the event, e.g. 'US Open Men's Singles Final'"},
        "winner": {"type": "string", "description": "Name of the winning player"},
        "score": {"type": "string", "description": "Final match score"},
    },
}

COPERNICUS_SCHEMA = {
    "type": "object",
    "required": ["headline", "value", "period"],
    "properties": {
        "headline": {"type": "string", "description": "Headline finding of the bulletin"},
        "value": {"type": "string", "description": "Key reported figure, e.g. a temperature anomaly"},
        "period": {"type": "string", "description": "Time period the report covers"},
    },
}


def write_datapoint(source: str, result: dict[str, Any], path: str = OUTPUT_PATH) -> None:
    """Append one oracle datapoint as a line of JSON (JSONL)."""
    record = {
        "source": source,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        **result,
    }
    with open(path, "a") as f:
        f.write(json.dumps(record) + "\n")


def fetch_us_open_result() -> dict[str, Any]:
    return fetch_datapoint(
        query="US Open tennis 2025 singles final result winner score",
        output_schema=US_OPEN_SCHEMA,
        system_prompt="Prefer usopen.org and atptour.com. Return only confirmed final results, not predictions.",
        include_domains=["usopen.org", "atptour.com"],
    )


def fetch_copernicus_climate_bulletin() -> dict[str, Any]:
    return fetch_datapoint(
        query="Copernicus Climate Change Service latest monthly global temperature bulletin",
        output_schema=COPERNICUS_SCHEMA,
        system_prompt="Prefer climate.copernicus.eu. Report the most recently published bulletin only.",
        include_domains=["climate.copernicus.eu"],
    )


if __name__ == "__main__":
    for label, fetch in [
        ("US Open", fetch_us_open_result),
        ("Copernicus", fetch_copernicus_climate_bulletin),
    ]:
        result = fetch()
        write_datapoint(label, result)
        print(f"--- {label} ---")
        print(json.dumps(result, indent=2))
