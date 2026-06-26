"""SCR-04 동선 최적화 행렬 캐시 단위 테스트 (#274)."""

import httpx
import pytest

from app.services import route_matrix_cache as rmc


def test_pair_key_rounds_and_is_directional() -> None:
    # 좌표 5자리 반올림 → 미세차이는 같은 키
    assert rmc.pair_key(34.700001, 135.500001, 34.71, 135.51) == rmc.pair_key(
        34.700002, 135.500002, 34.71, 135.51
    )
    # 방향이 다르면 키가 다르다(비대칭)
    assert rmc.pair_key(34.70, 135.50, 34.71, 135.51) != rmc.pair_key(
        34.71, 135.51, 34.70, 135.50
    )


def test_cache_enabled_requires_url_and_key(monkeypatch) -> None:
    monkeypatch.setattr(rmc, "ROUTE_MATRIX_CACHE_ENABLED", True)
    monkeypatch.setattr(rmc, "SUPABASE_URL", "")
    monkeypatch.setattr(rmc, "SUPABASE_SERVICE_ROLE_KEY", "")
    assert rmc.cache_enabled() is False
    monkeypatch.setattr(rmc, "SUPABASE_URL", "https://x.supabase.co")
    monkeypatch.setattr(rmc, "SUPABASE_SERVICE_ROLE_KEY", "k")
    assert rmc.cache_enabled() is True


@pytest.mark.asyncio
async def test_get_durations_disabled_returns_empty(monkeypatch) -> None:
    monkeypatch.setattr(rmc, "ROUTE_MATRIX_CACHE_ENABLED", False)
    assert await rmc.get_durations(["k1"]) == {}


@pytest.mark.asyncio
async def test_get_durations_parses_rows(monkeypatch) -> None:
    monkeypatch.setattr(rmc, "ROUTE_MATRIX_CACHE_ENABLED", True)
    monkeypatch.setattr(rmc, "SUPABASE_URL", "https://x.supabase.co")
    monkeypatch.setattr(rmc, "SUPABASE_SERVICE_ROLE_KEY", "k")

    async def fake_get(self, url, *args, **kwargs):
        return httpx.Response(
            200,
            json=[{"pair_key": "k1", "duration_seconds": 642}],
            request=httpx.Request("GET", url),
        )

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)
    assert await rmc.get_durations(["k1"]) == {"k1": 642}


@pytest.mark.asyncio
async def test_get_durations_swallows_errors(monkeypatch) -> None:
    monkeypatch.setattr(rmc, "ROUTE_MATRIX_CACHE_ENABLED", True)
    monkeypatch.setattr(rmc, "SUPABASE_URL", "https://x.supabase.co")
    monkeypatch.setattr(rmc, "SUPABASE_SERVICE_ROLE_KEY", "k")

    async def boom(self, url, *args, **kwargs):
        raise httpx.ConnectError("boom")

    monkeypatch.setattr(httpx.AsyncClient, "get", boom)
    assert await rmc.get_durations(["k1"]) == {}  # 폴백(빈 dict)


@pytest.mark.asyncio
async def test_put_durations_swallows_errors(monkeypatch) -> None:
    monkeypatch.setattr(rmc, "ROUTE_MATRIX_CACHE_ENABLED", True)
    monkeypatch.setattr(rmc, "SUPABASE_URL", "https://x.supabase.co")
    monkeypatch.setattr(rmc, "SUPABASE_SERVICE_ROLE_KEY", "k")

    async def boom(self, url, *args, **kwargs):
        raise httpx.ConnectError("boom")

    monkeypatch.setattr(httpx.AsyncClient, "post", boom)
    # 예외가 새어나오지 않아야 한다
    await rmc.put_durations([{"pair_key": "k1", "duration_seconds": 1}])
