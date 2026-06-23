from __future__ import annotations

import asyncio

import httpx
import pytest

from app.services import places_cache as pc


def test_normalize_query_collapses_and_lowercases() -> None:
    assert pc.normalize_query("  Tokyo   Tower ") == "tokyo tower"


def test_normalize_query_applies_nfkc() -> None:
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
    assert pc._expires_at(False) > pc._expires_at(True)


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
    pc.log_summary()


@pytest.mark.asyncio
async def test_http_get_cache_returns_entry_on_hit(monkeypatch) -> None:
    monkeypatch.setattr(pc, "SUPABASE_URL", "https://proj.supabase.co")
    monkeypatch.setattr(pc, "SUPABASE_SERVICE_ROLE_KEY", "svc-key")
    captured: dict = {}

    async def fake_get(self, url, params=None, headers=None, **kwargs):
        captured["url"] = url
        captured["params"] = params
        captured["headers"] = headers
        request = httpx.Request("GET", url)
        return httpx.Response(
            200,
            json=[{"place_json": {"id": "p1"}, "is_negative": False}],
            request=request,
        )

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    out = await pc._http_get_cache("KEY123")

    assert out == pc.CacheEntry(place={"id": "p1"}, is_negative=False)
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
        "KEY123",
        "tokyo tower",
        "jp",
        "mv0",
        pc.CacheEntry(place={"id": "p1"}),
        "2026-06-18T00:00:00+00:00",
    )

    assert captured["url"] == "https://proj.supabase.co/rest/v1/places_cache"
    assert captured["json"]["cache_key"] == "KEY123"
    assert captured["json"]["place_json"] == {"id": "p1"}
    assert captured["json"]["is_negative"] is False
    assert captured["json"]["region_code"] == "jp"
    assert "resolution=merge-duplicates" in captured["headers"]["Prefer"]


def _fake_store(monkeypatch):
    store: dict[str, pc.CacheEntry] = {}

    async def fake_get(cache_key):
        return store.get(cache_key)

    async def fake_put(cache_key, qn, rc, mv, entry, expires_at_iso):
        store[cache_key] = entry

    monkeypatch.setattr(pc, "PLACES_CACHE_ENABLED", True)
    monkeypatch.setattr(pc, "SUPABASE_URL", "https://proj.supabase.co")
    monkeypatch.setattr(pc, "SUPABASE_SERVICE_ROLE_KEY", "svc-key")
    monkeypatch.setattr(pc, "_http_get_cache", fake_get)
    monkeypatch.setattr(pc, "_http_put_cache", fake_put)
    return store


@pytest.mark.asyncio
async def test_lookup_or_resolve_calls_resolve_once_for_identical_queries(monkeypatch) -> None:
    _fake_store(monkeypatch)
    calls = {"n": 0}

    async def resolve():
        calls["n"] += 1
        return pc.CacheEntry(place={"id": "x"})

    a = await pc.lookup_or_resolve("Tokyo Tower", "jp", "shape", resolve=resolve)
    b = await pc.lookup_or_resolve("tokyo  tower", "jp", "shape", resolve=resolve)

    assert a == b == pc.CacheEntry(place={"id": "x"})
    assert calls["n"] == 1


@pytest.mark.asyncio
async def test_lookup_or_resolve_negative_result_is_stored(monkeypatch) -> None:
    store = _fake_store(monkeypatch)
    stored: list[pc.CacheEntry] = []

    async def fake_put(cache_key, qn, rc, mv, entry, expires_at_iso):
        stored.append(entry)
        store[cache_key] = entry

    monkeypatch.setattr(pc, "_http_put_cache", fake_put)

    async def resolve():
        return pc.CacheEntry(is_negative=True)

    out = await pc.lookup_or_resolve("nowhere place", None, "shape", resolve=resolve)
    assert out == pc.CacheEntry(is_negative=True)
    assert stored == [pc.CacheEntry(is_negative=True)]


@pytest.mark.asyncio
async def test_lookup_or_resolve_does_not_cache_http_errors(monkeypatch) -> None:
    _fake_store(monkeypatch)
    put_called = {"n": 0}

    async def fake_put(*args, **kwargs):
        put_called["n"] += 1

    monkeypatch.setattr(pc, "_http_put_cache", fake_put)

    async def resolve():
        raise httpx.HTTPError("boom")

    with pytest.raises(httpx.HTTPError):
        await pc.lookup_or_resolve("x", None, "shape", resolve=resolve)
    assert put_called["n"] == 0


@pytest.mark.asyncio
async def test_lookup_or_resolve_falls_back_to_resolve_when_read_errors(monkeypatch) -> None:
    _fake_store(monkeypatch)

    async def failing_get(cache_key):
        raise RuntimeError("db down")

    monkeypatch.setattr(pc, "_http_get_cache", failing_get)
    calls = {"n": 0}

    async def resolve():
        calls["n"] += 1
        return pc.CacheEntry(place={"id": "y"})

    out = await pc.lookup_or_resolve("x", None, "shape", resolve=resolve)
    assert out == pc.CacheEntry(place={"id": "y"})
    assert calls["n"] == 1


@pytest.mark.asyncio
async def test_lookup_or_resolve_disabled_bypasses_cache(monkeypatch) -> None:
    _fake_store(monkeypatch)
    monkeypatch.setattr(pc, "PLACES_CACHE_ENABLED", False)
    get_called = {"n": 0}

    async def fake_get(cache_key):
        get_called["n"] += 1
        return pc.CacheEntry(place={"id": "cached"})

    monkeypatch.setattr(pc, "_http_get_cache", fake_get)

    async def resolve():
        return pc.CacheEntry(place={"id": "z"})

    out = await pc.lookup_or_resolve("x", None, "shape", resolve=resolve)
    assert out == pc.CacheEntry(place={"id": "z"})
    assert get_called["n"] == 0


@pytest.mark.asyncio
async def test_lookup_or_resolve_unconfigured_bypasses_cache(monkeypatch) -> None:
    _fake_store(monkeypatch)
    monkeypatch.setattr(pc, "SUPABASE_URL", "")
    get_called = {"n": 0}

    async def fake_get(cache_key):
        get_called["n"] += 1
        return pc.CacheEntry(place={"id": "cached"})

    monkeypatch.setattr(pc, "_http_get_cache", fake_get)

    async def resolve():
        return pc.CacheEntry(place={"id": "z"})

    out = await pc.lookup_or_resolve("x", None, "shape", resolve=resolve)
    assert out == pc.CacheEntry(place={"id": "z"})
    assert get_called["n"] == 0


@pytest.mark.asyncio
async def test_lookup_or_resolve_scope_counts_l1_hit(monkeypatch) -> None:
    _fake_store(monkeypatch)
    pc.begin_scope()
    calls = {"n": 0}

    async def resolve():
        calls["n"] += 1
        return pc.CacheEntry(place={"id": "a"})

    await pc.lookup_or_resolve("same query", None, "shape", resolve=resolve)
    await pc.lookup_or_resolve("same query", None, "shape", resolve=resolve)

    scope = pc.current_scope()
    assert calls["n"] == 1
    assert scope.google_calls == 1
    assert scope.l1_hits == 1


@pytest.mark.asyncio
async def test_lookup_or_resolve_dedupes_concurrent_misses(monkeypatch) -> None:
    _fake_store(monkeypatch)
    pc.begin_scope()
    calls = {"n": 0}

    async def resolve():
        calls["n"] += 1
        return pc.CacheEntry(place={"id": "a"})

    a, b = await asyncio.gather(
        pc.lookup_or_resolve("same query", None, "shape", resolve=resolve),
        pc.lookup_or_resolve("same query", None, "shape", resolve=resolve),
    )

    assert a == b == pc.CacheEntry(place={"id": "a"})
    assert calls["n"] == 1


@pytest.mark.asyncio
async def test_lookup_or_resolve_does_not_cache_unstorable_entry(monkeypatch) -> None:
    _fake_store(monkeypatch)
    put_called = {"n": 0}

    async def fake_put(*args, **kwargs):
        put_called["n"] += 1

    monkeypatch.setattr(pc, "_http_put_cache", fake_put)
    pc.begin_scope()

    async def resolve():
        return pc.CacheEntry()

    out = await pc.lookup_or_resolve("x", None, "shape", resolve=resolve)
    assert out == pc.CacheEntry()
    assert put_called["n"] == 0
    assert pc.current_scope().memo == {}
