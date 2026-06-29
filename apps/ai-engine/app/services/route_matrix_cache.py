"""SCR-04 동선 최적화 이동시간 행렬 캐시 (#274).

route_legs_cache(verify, best-mode)와 분리된 DRIVE 전용 캐시.
Supabase PostgREST(L2)로 pair 단위 duration 을 저장/조회한다(places_cache 와 동일 패턴).
캐시 실패는 절대 최적화를 깨지 않는다(에러 무해화 → Route Matrix 폴백).
"""

from __future__ import annotations

import hashlib
import logging
import os
from datetime import datetime, timedelta, timezone

import httpx

logger = logging.getLogger(__name__)

# 테스트에서 monkeypatch 할 수 있도록 모듈 전역으로 둔다.
ROUTE_MATRIX_CACHE_ENABLED = os.getenv("ROUTE_MATRIX_CACHE_ENABLED", "true").lower() == "true"
ROUTE_MATRIX_CACHE_TTL_DAYS = int(os.getenv("ROUTE_MATRIX_CACHE_TTL_DAYS", "30"))
CACHE_READ_TIMEOUT = float(os.getenv("ROUTE_MATRIX_CACHE_READ_TIMEOUT", "1.5"))
CACHE_WRITE_TIMEOUT = float(os.getenv("ROUTE_MATRIX_CACHE_WRITE_TIMEOUT", "2.0"))

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

_TABLE_PATH = "/rest/v1/route_matrix_cache"
_COORD_PRECISION = 100_000.0  # 좌표 5자리(약 1m) — 백엔드 COORD_PRECISION 과 일치
MODE = "driving"


def cache_enabled() -> bool:
    return bool(ROUTE_MATRIX_CACHE_ENABLED and SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)


def round_coord(value: float) -> float:
    return round(value * _COORD_PRECISION) / _COORD_PRECISION


def pair_key(o_lat: float, o_lng: float, d_lat: float, d_lng: float, mode: str = MODE) -> str:
    raw = f"{round_coord(o_lat)},{round_coord(o_lng)},{round_coord(d_lat)},{round_coord(d_lng)},{mode}"
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()


def _headers() -> dict:
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }


async def get_durations(keys: list[str]) -> dict[str, int]:
    """비만료 행의 {pair_key: duration_seconds}. 비활성/실패 시 빈 dict(폴백)."""
    if not keys or not cache_enabled():
        return {}
    now_iso = datetime.now(timezone.utc).isoformat()
    params = {
        "pair_key": f"in.({','.join(keys)})",
        "expires_at": f"gt.{now_iso}",
        "select": "pair_key,duration_seconds",
    }
    try:
        async with httpx.AsyncClient(timeout=CACHE_READ_TIMEOUT) as client:
            resp = await client.get(f"{SUPABASE_URL}{_TABLE_PATH}", params=params, headers=_headers())
            resp.raise_for_status()
            rows = resp.json()
        return {
            r["pair_key"]: int(r["duration_seconds"])
            for r in rows
            if r.get("duration_seconds") is not None
        }
    except Exception as exc:  # noqa: BLE001 - 캐시 실패가 최적화를 깨면 안 됨
        logger.warning("route_matrix_cache read failed | error=%s", exc)
        return {}


async def put_durations(rows: list[dict]) -> None:
    """rows: [{pair_key, origin_lat, origin_lng, dest_lat, dest_lng, mode, duration_seconds, distance_meters}].

    PostgREST upsert(Prefer: merge-duplicates). 비활성/실패 시 무시(에러 무해화).
    """
    if not rows or not cache_enabled():
        return
    expires = (datetime.now(timezone.utc) + timedelta(days=ROUTE_MATRIX_CACHE_TTL_DAYS)).isoformat()
    body = [{**row, "expires_at": expires} for row in rows]
    headers = {**_headers(), "Prefer": "resolution=merge-duplicates,return=minimal"}
    try:
        async with httpx.AsyncClient(timeout=CACHE_WRITE_TIMEOUT) as client:
            resp = await client.post(f"{SUPABASE_URL}{_TABLE_PATH}", json=body, headers=headers)
            resp.raise_for_status()
    except Exception as exc:  # noqa: BLE001
        logger.warning("route_matrix_cache write failed | error=%s", exc)
