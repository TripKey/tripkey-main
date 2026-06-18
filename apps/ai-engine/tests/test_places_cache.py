from __future__ import annotations

import httpx
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


def _fake_store(monkeypatch):
    """L2를 dict로 대체하는 fake repository를 설치하고 store를 반환."""
    store: dict = {}

    async def fake_get(cache_key):
        return store.get(cache_key)

    async def fake_put(cache_key, qn, rc, mv, response_json, result_count, expires_at_iso):
        store[cache_key] = response_json

    monkeypatch.setattr(pc, "PLACES_CACHE_ENABLED", True)
    monkeypatch.setattr(pc, "_http_get_cache", fake_get)
    monkeypatch.setattr(pc, "_http_put_cache", fake_put)
    return store


@pytest.mark.asyncio
async def test_cached_search_calls_fetch_once_for_identical_queries(monkeypatch) -> None:
    _fake_store(monkeypatch)
    calls = {"n": 0}

    async def fetch():
        calls["n"] += 1
        return {"places": [{"id": "x"}]}

    # 정규화로 두 쿼리가 같은 키로 접힘 ("Tokyo Tower" / "tokyo  tower")
    a = await pc.cached_search("Tokyo Tower", "jp", "shape", fetch=fetch)
    b = await pc.cached_search("tokyo  tower", "jp", "shape", fetch=fetch)

    assert a == b == {"places": [{"id": "x"}]}
    assert calls["n"] == 1


@pytest.mark.asyncio
async def test_cached_search_negative_result_is_stored(monkeypatch) -> None:
    store = _fake_store(monkeypatch)
    put_counts: list[int] = []

    async def fake_put(cache_key, qn, rc, mv, response_json, result_count, expires_at_iso):
        put_counts.append(result_count)
        store[cache_key] = response_json

    monkeypatch.setattr(pc, "_http_put_cache", fake_put)

    async def fetch():
        return {"places": []}

    out = await pc.cached_search("nowhere place", None, "shape", fetch=fetch)
    assert out == {"places": []}
    assert put_counts == [0]  # negative로 저장됨


@pytest.mark.asyncio
async def test_cached_search_does_not_cache_http_errors(monkeypatch) -> None:
    _fake_store(monkeypatch)
    put_called = {"n": 0}

    async def fake_put(*args, **kwargs):
        put_called["n"] += 1

    monkeypatch.setattr(pc, "_http_put_cache", fake_put)

    async def fetch():
        raise httpx.HTTPError("boom")

    with pytest.raises(httpx.HTTPError):
        await pc.cached_search("x", None, "shape", fetch=fetch)
    assert put_called["n"] == 0


@pytest.mark.asyncio
async def test_cached_search_falls_back_to_fetch_when_read_errors(monkeypatch) -> None:
    _fake_store(monkeypatch)

    async def failing_get(cache_key):
        raise RuntimeError("db down")

    monkeypatch.setattr(pc, "_http_get_cache", failing_get)
    calls = {"n": 0}

    async def fetch():
        calls["n"] += 1
        return {"places": [{"id": "y"}]}

    out = await pc.cached_search("x", None, "shape", fetch=fetch)
    assert out == {"places": [{"id": "y"}]}
    assert calls["n"] == 1  # read 실패에도 Google로 폴백


@pytest.mark.asyncio
async def test_cached_search_disabled_bypasses_cache(monkeypatch) -> None:
    _fake_store(monkeypatch)
    monkeypatch.setattr(pc, "PLACES_CACHE_ENABLED", False)
    get_called = {"n": 0}

    async def fake_get(cache_key):
        get_called["n"] += 1
        return {"places": []}

    monkeypatch.setattr(pc, "_http_get_cache", fake_get)

    async def fetch():
        return {"places": [{"id": "z"}]}

    out = await pc.cached_search("x", None, "shape", fetch=fetch)
    assert out == {"places": [{"id": "z"}]}
    assert get_called["n"] == 0  # 캐시 완전 우회


@pytest.mark.asyncio
async def test_cached_search_scope_counts_l1_hit(monkeypatch) -> None:
    _fake_store(monkeypatch)
    pc.begin_scope()
    calls = {"n": 0}

    async def fetch():
        calls["n"] += 1
        return {"places": [{"id": "a"}]}

    await pc.cached_search("same query", None, "shape", fetch=fetch)  # miss -> fetch
    await pc.cached_search("same query", None, "shape", fetch=fetch)  # L1 hit

    scope = pc.current_scope()
    assert calls["n"] == 1
    assert scope.google_calls == 1
    assert scope.l1_hits == 1


@pytest.mark.asyncio
async def test_cached_search_does_not_cache_none_result(monkeypatch) -> None:
    _fake_store(monkeypatch)
    put_called = {"n": 0}

    async def fake_put(*args, **kwargs):
        put_called["n"] += 1

    monkeypatch.setattr(pc, "_http_put_cache", fake_put)
    pc.begin_scope()

    async def fetch():
        return None

    out = await pc.cached_search("x", None, "shape", fetch=fetch)
    assert out is None
    assert put_called["n"] == 0  # None은 L2에 쓰지 않음
    assert pc.current_scope().memo == {}  # None은 메모하지 않음(재시도 허용)
