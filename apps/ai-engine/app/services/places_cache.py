from __future__ import annotations

import hashlib
import logging
import os
import re
import unicodedata
from contextvars import ContextVar
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Awaitable, Callable, Optional

import httpx

logger = logging.getLogger(__name__)

# ── Config (호출 시점에 모듈 전역으로 읽힘 → 테스트에서 monkeypatch 가능) ──
PLACES_CACHE_ENABLED = os.getenv("PLACES_CACHE_ENABLED", "true").lower() == "true"
PLACES_CACHE_TTL_POSITIVE_DAYS = int(os.getenv("PLACES_CACHE_TTL_POSITIVE_DAYS", "60"))
PLACES_CACHE_TTL_NEGATIVE_HOURS = int(os.getenv("PLACES_CACHE_TTL_NEGATIVE_HOURS", "24"))
CACHE_READ_TIMEOUT = float(os.getenv("PLACES_CACHE_READ_TIMEOUT", "1.5"))
CACHE_WRITE_TIMEOUT = float(os.getenv("PLACES_CACHE_WRITE_TIMEOUT", "2.0"))

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

_TABLE_PATH = "/rest/v1/places_cache"
_WHITESPACE_RE = re.compile(r"\s+")


def normalize_query(query: str) -> str:
    normalized = unicodedata.normalize("NFKC", query or "")
    normalized = normalized.strip().lower()
    normalized = _WHITESPACE_RE.sub(" ", normalized)
    return normalized


def mask_version(shape: str) -> str:
    return hashlib.sha1((shape or "").encode("utf-8")).hexdigest()[:12]


def build_cache_key(query_normalized: str, region_code: str, mask_version_str: str) -> str:
    raw = f"{query_normalized}|{region_code}|{mask_version_str}"
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()


def _expires_at(result_count: int) -> str:
    now = datetime.now(timezone.utc)
    if result_count > 0:
        return (now + timedelta(days=PLACES_CACHE_TTL_POSITIVE_DAYS)).isoformat()
    return (now + timedelta(hours=PLACES_CACHE_TTL_NEGATIVE_HOURS)).isoformat()


@dataclass
class RequestScope:
    memo: dict = field(default_factory=dict)
    l1_hits: int = 0
    l2_hits: int = 0
    misses: int = 0
    negatives: int = 0
    errors: int = 0
    google_calls: int = 0


_scope: ContextVar[Optional[RequestScope]] = ContextVar("places_cache_scope", default=None)


def begin_scope() -> None:
    """파싱 요청 진입부에서 호출. 이후 asyncio.gather 자식 태스크가 같은 스코프를 공유한다."""
    _scope.set(RequestScope())


def current_scope() -> Optional[RequestScope]:
    return _scope.get()


def log_summary() -> None:
    scope = current_scope()
    if scope is None:
        return
    logger.info(
        "places_cache summary | l1_hits=%d l2_hits=%d misses=%d negatives=%d errors=%d google_calls=%d",
        scope.l1_hits,
        scope.l2_hits,
        scope.misses,
        scope.negatives,
        scope.errors,
        scope.google_calls,
    )


def _headers() -> dict:
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }


async def _http_get_cache(cache_key: str) -> Optional[dict]:
    now_iso = datetime.now(timezone.utc).isoformat()
    params = {
        "cache_key": f"eq.{cache_key}",
        "expires_at": f"gt.{now_iso}",
        "select": "response_json",
        "limit": "1",
    }
    async with httpx.AsyncClient(timeout=CACHE_READ_TIMEOUT) as client:
        resp = await client.get(f"{SUPABASE_URL}{_TABLE_PATH}", params=params, headers=_headers())
        resp.raise_for_status()
        rows = resp.json()
    if rows:
        return rows[0].get("response_json")
    return None


async def _http_put_cache(
    cache_key: str,
    query_normalized: str,
    region_code: str,
    mask_version_str: str,
    response_json: dict,
    result_count: int,
    expires_at_iso: str,
) -> None:
    body = {
        "cache_key": cache_key,
        "query_normalized": query_normalized,
        "region_code": region_code,
        "mask_version": mask_version_str,
        "response_json": response_json,
        "result_count": result_count,
        "expires_at": expires_at_iso,
    }
    headers = {**_headers(), "Prefer": "resolution=merge-duplicates,return=minimal"}
    async with httpx.AsyncClient(timeout=CACHE_WRITE_TIMEOUT) as client:
        resp = await client.post(f"{SUPABASE_URL}{_TABLE_PATH}", json=body, headers=headers)
        resp.raise_for_status()


async def cached_search(
    query: str,
    region_code: Optional[str],
    shape: str,
    *,
    fetch: Callable[[], Awaitable[Optional[dict]]],
) -> Optional[dict]:
    """Places 검색을 캐시로 감싼다. fetch는 캐시 미스 시 호출되는 실제 Google 호출.

    안전 원칙: L2(read/write) 실패는 절대 enrichment를 깨뜨리지 않고 fetch로 폴백한다.
    fetch 자체의 httpx 에러는 캐시하지 않고 그대로 전파한다(호출부가 catch).
    """
    if not PLACES_CACHE_ENABLED:
        return await fetch()

    scope = current_scope()
    qn = normalize_query(query)
    rc = region_code or ""
    mv = mask_version(shape)
    key = build_cache_key(qn, rc, mv)

    # L1 메모
    if scope is not None and key in scope.memo:
        scope.l1_hits += 1
        return scope.memo[key]

    # L2 read
    cached: Optional[dict] = None
    try:
        cached = await _http_get_cache(key)
    except Exception as exc:  # noqa: BLE001 - 캐시는 enrichment를 깨뜨리면 안 됨
        logger.warning("places_cache read failed | key=%s | error=%s", key, exc)
        if scope is not None:
            scope.errors += 1
    if cached is not None:
        if scope is not None:
            scope.memo[key] = cached
            scope.l2_hits += 1
        return cached

    if scope is not None:
        scope.misses += 1

    # fetch (httpx 에러는 전파, 실패는 캐시하지 않음)
    result = await fetch()
    if scope is not None:
        scope.google_calls += 1

    # L2 write
    try:
        count = len(result.get("places") or []) if isinstance(result, dict) else 0
        await _http_put_cache(key, qn, rc, mv, result, count, _expires_at(count))
        if scope is not None and count == 0:
            scope.negatives += 1
    except Exception as exc:  # noqa: BLE001
        logger.warning("places_cache write failed | key=%s | error=%s", key, exc)
        if scope is not None:
            scope.errors += 1

    if scope is not None:
        scope.memo[key] = result
    return result
