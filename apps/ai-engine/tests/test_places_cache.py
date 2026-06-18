from __future__ import annotations

import pytest

from app.services import places_cache as pc


def test_normalize_query_collapses_and_lowercases() -> None:
    assert pc.normalize_query("  Tokyo   Tower ") == "tokyo tower"


def test_normalize_query_applies_nfkc() -> None:
    # 전각 영문 -> 반각 후 소문자
    assert pc.normalize_query("ＡＢＣ") == "abc"


def test_mask_version_is_stable_and_shape_sensitive() -> None:
    assert pc.mask_version("a") == pc.mask_version("a")
    assert pc.mask_version("a") != pc.mask_version("b")


def test_build_cache_key_is_deterministic_and_region_sensitive() -> None:
    k1 = pc.build_cache_key("tokyo tower", "jp", "mv")
    k2 = pc.build_cache_key("tokyo tower", "jp", "mv")
    k3 = pc.build_cache_key("tokyo tower", "", "mv")
    assert k1 == k2
    assert k1 != k3


def test_expires_at_positive_is_later_than_negative() -> None:
    assert pc._expires_at(3) > pc._expires_at(0)


def test_begin_scope_creates_fresh_zeroed_scope() -> None:
    pc.begin_scope()
    first = pc.current_scope()
    assert isinstance(first, pc.RequestScope)
    first.l2_hits = 5
    pc.begin_scope()
    second = pc.current_scope()
    assert second is not first
    assert second.l2_hits == 0
    assert second.memo == {}


def test_log_summary_does_not_raise_with_active_scope() -> None:
    pc.begin_scope()
    pc.current_scope().google_calls = 2
    pc.log_summary()  # 예외 없이 동작하면 통과


import httpx


@pytest.mark.asyncio
async def test_http_get_cache_returns_response_json_on_hit(monkeypatch) -> None:
    monkeypatch.setattr(pc, "SUPABASE_URL", "https://proj.supabase.co")
    monkeypatch.setattr(pc, "SUPABASE_SERVICE_ROLE_KEY", "svc-key")
    captured: dict = {}

    async def fake_get(self, url, params=None, headers=None, **kwargs):
        captured["url"] = url
        captured["params"] = params
        captured["headers"] = headers
        request = httpx.Request("GET", url)
        return httpx.Response(
            200, json=[{"response_json": {"places": [{"id": "p1"}]}}], request=request
        )

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    out = await pc._http_get_cache("KEY123")

    assert out == {"places": [{"id": "p1"}]}
    assert captured["url"] == "https://proj.supabase.co/rest/v1/places_cache"
    assert captured["params"]["cache_key"] == "eq.KEY123"
    assert captured["params"]["expires_at"].startswith("gt.")
    assert captured["headers"]["apikey"] == "svc-key"
    assert captured["headers"]["Authorization"] == "Bearer svc-key"


@pytest.mark.asyncio
async def test_http_get_cache_returns_none_on_miss(monkeypatch) -> None:
    monkeypatch.setattr(pc, "SUPABASE_URL", "https://proj.supabase.co")
    monkeypatch.setattr(pc, "SUPABASE_SERVICE_ROLE_KEY", "svc-key")

    async def fake_get(self, url, params=None, headers=None, **kwargs):
        request = httpx.Request("GET", url)
        return httpx.Response(200, json=[], request=request)

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    out = await pc._http_get_cache("KEY123")
    assert out is None


@pytest.mark.asyncio
async def test_http_put_cache_sends_upsert_body_and_prefer_header(monkeypatch) -> None:
    monkeypatch.setattr(pc, "SUPABASE_URL", "https://proj.supabase.co")
    monkeypatch.setattr(pc, "SUPABASE_SERVICE_ROLE_KEY", "svc-key")
    captured: dict = {}

    async def fake_post(self, url, json=None, headers=None, **kwargs):
        captured["url"] = url
        captured["json"] = json
        captured["headers"] = headers
        request = httpx.Request("POST", url)
        return httpx.Response(201, json=[], request=request)

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    await pc._http_put_cache(
        "KEY123", "tokyo tower", "jp", "mv0", {"places": []}, 0, "2026-06-18T00:00:00+00:00"
    )

    assert captured["url"] == "https://proj.supabase.co/rest/v1/places_cache"
    assert captured["json"]["cache_key"] == "KEY123"
    assert captured["json"]["result_count"] == 0
    assert captured["json"]["region_code"] == "jp"
    assert "resolution=merge-duplicates" in captured["headers"]["Prefer"]
