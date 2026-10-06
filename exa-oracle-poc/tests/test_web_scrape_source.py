import json
from dataclasses import dataclass
from datetime import datetime
from types import SimpleNamespace

import pytest

import web_scrape_source as wss


# ---------------------------------------------------------------------------
# get_client()
# ---------------------------------------------------------------------------


def test_get_client_raises_without_api_key(monkeypatch):
    monkeypatch.delenv("EXA_API_KEY", raising=False)
    with pytest.raises(RuntimeError, match="EXA_API_KEY"):
        wss.get_client()


def test_get_client_returns_exa_with_key(monkeypatch):
    monkeypatch.setenv("EXA_API_KEY", "test-key")
    sentinel = object()
    calls = []

    def fake_exa(api_key):
        calls.append(api_key)
        return sentinel

    monkeypatch.setattr(wss, "Exa", fake_exa)

    client = wss.get_client()

    assert client is sentinel
    assert calls == ["test-key"]


# ---------------------------------------------------------------------------
# fetch_datapoint()
# ---------------------------------------------------------------------------


@dataclass
class FakeGroundingEntry:
    field: str
    confidence: str


def _fake_exa(content, grounding):
    search_calls = []

    def search(query, **kwargs):
        search_calls.append((query, kwargs))
        return SimpleNamespace(output=SimpleNamespace(content=content, grounding=grounding))

    return SimpleNamespace(search=search), search_calls


def test_fetch_datapoint_calls_search_with_expected_kwargs(monkeypatch):
    exa, search_calls = _fake_exa(content={"a": "b"}, grounding=[])
    monkeypatch.setattr(wss, "get_client", lambda: exa)

    wss.fetch_datapoint(
        query="q",
        output_schema={"type": "object"},
        system_prompt="prompt",
        include_domains=["example.com"],
        max_age_hours=5,
    )

    assert len(search_calls) == 1
    query, kwargs = search_calls[0]
    assert query == "q"
    assert kwargs == {
        "type": "neural",
        "system_prompt": "prompt",
        "output_schema": {"type": "object"},
        "include_domains": ["example.com"],
        "contents": {"highlights": True, "max_age_hours": 5},
    }


def test_fetch_datapoint_converts_dataclass_grounding(monkeypatch):
    exa, _ = _fake_exa(content={"a": "b"}, grounding=[FakeGroundingEntry(field="a", confidence="high")])
    monkeypatch.setattr(wss, "get_client", lambda: exa)

    result = wss.fetch_datapoint("q", {}, "p", [])

    assert result == {
        "datapoint": {"a": "b"},
        "grounding": [{"field": "a", "confidence": "high"}],
    }


def test_fetch_datapoint_passes_through_dict_grounding(monkeypatch):
    exa, _ = _fake_exa(content={"a": "b"}, grounding=[{"field": "a", "confidence": "low"}])
    monkeypatch.setattr(wss, "get_client", lambda: exa)

    result = wss.fetch_datapoint("q", {}, "p", [])

    assert result["grounding"] == [{"field": "a", "confidence": "low"}]


# ---------------------------------------------------------------------------
# write_datapoint()
# ---------------------------------------------------------------------------


def test_write_datapoint_appends_expected_jsonl_line(tmp_path):
    path = tmp_path / "out.jsonl"
    result = {"datapoint": {"winner": "X"}, "grounding": []}

    wss.write_datapoint("US Open", result, path=str(path))

    lines = path.read_text().splitlines()
    assert len(lines) == 1
    record = json.loads(lines[0])
    assert record["source"] == "US Open"
    assert record["datapoint"] == {"winner": "X"}
    assert record["grounding"] == []
    # Raises if fetched_at isn't a valid ISO-8601 timestamp.
    datetime.fromisoformat(record["fetched_at"])


def test_write_datapoint_appends_without_truncating(tmp_path):
    path = tmp_path / "out.jsonl"
    wss.write_datapoint("A", {"datapoint": {}, "grounding": []}, path=str(path))
    wss.write_datapoint("B", {"datapoint": {}, "grounding": []}, path=str(path))

    lines = path.read_text().splitlines()
    assert len(lines) == 2
    assert json.loads(lines[0])["source"] == "A"
    assert json.loads(lines[1])["source"] == "B"


# ---------------------------------------------------------------------------
# fetch_us_open_result() / fetch_copernicus_climate_bulletin()
# ---------------------------------------------------------------------------


def test_fetch_us_open_result_uses_expected_schema_and_domains(monkeypatch):
    sentinel = object()
    calls = []

    def fake_fetch_datapoint(**kwargs):
        calls.append(kwargs)
        return sentinel

    monkeypatch.setattr(wss, "fetch_datapoint", fake_fetch_datapoint)

    result = wss.fetch_us_open_result()

    assert result is sentinel
    assert len(calls) == 1
    kwargs = calls[0]
    assert kwargs["output_schema"] == wss.US_OPEN_SCHEMA
    assert kwargs["include_domains"] == ["usopen.org", "atptour.com"]
    assert isinstance(kwargs["query"], str) and kwargs["query"]
    assert isinstance(kwargs["system_prompt"], str) and kwargs["system_prompt"]


def test_fetch_copernicus_bulletin_uses_expected_schema_and_domains(monkeypatch):
    sentinel = object()
    calls = []

    def fake_fetch_datapoint(**kwargs):
        calls.append(kwargs)
        return sentinel

    monkeypatch.setattr(wss, "fetch_datapoint", fake_fetch_datapoint)

    result = wss.fetch_copernicus_climate_bulletin()

    assert result is sentinel
    assert len(calls) == 1
    kwargs = calls[0]
    assert kwargs["output_schema"] == wss.COPERNICUS_SCHEMA
    assert kwargs["include_domains"] == ["climate.copernicus.eu"]
    assert isinstance(kwargs["query"], str) and kwargs["query"]
    assert isinstance(kwargs["system_prompt"], str) and kwargs["system_prompt"]
