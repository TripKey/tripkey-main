from __future__ import annotations

import asyncio
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

# Config is read into module globals so tests can monkeypatch the values.
PLACES_CACHE_ENABLED = os.getenv("PLACES_CACHE_ENABLED", "true").lower() == "true"
PLACES_CACHE_TTL_POSITIVE_DAYS = int(os.getenv("PLACES_CACHE_TTL_POSITIVE_DAYS", "60"))
PLACES_CACHE_TTL_NEGATIVE_HOURS = int(os.getenv("PLACES_CACHE_TTL_NEGATIVE_HOURS", "24"))
CACHE_READ_TIMEOUT = float(os.getenv("PLACES_CACHE_READ_TIMEOUT", "1.5"))
CACHE_WRITE_TIMEOUT = float(os.getenv("PLACES_CACHE_WRITE_TIMEOUT", "2.0"))

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

_TABLE_PATH = "/rest/v1/places_cache"
_WHITESPACE_RE = re.compile(r"\s+")


@dataclass(frozen=True)
class CacheEntry:
    place: Optional[dict] = None
    is_negative: bool = False

    def is_storable(self) -> bool:
        return self.place is not None or self.is_negative


@dataclass
class RequestScope:
    memo: dict[str, CacheEntry] = field(default_factory=dict)
    in_flight: dict[str, asyncio.Task[CacheEntry]] = field(default_factory=dict)
    l1_hits: int = 0
    l2_hits: int = 0
    misses: int = 0
    negatives: int = 0
    errors: int = 0
    google_calls: int = 0


_scope: ContextVar[Optional[RequestScope]] = ContextVar("places_cache_scope", default=None)


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


def _cache_enabled() -> bool:
    return bool(PLACES_CACHE_ENABLED and SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)


def _expires_at(is_negative: bool) -> str:
    now = datetime.now(timezone.utc)
    if is_negative:
        return (now + timedelta(hours=PLACES_CACHE_TTL_NEGATIVE_HOURS)).isoformat()
    return (now + timedelta(days=PLACES_CACHE_TTL_POSITIVE_DAYS)).isoformat()


def begin_scope() -> None:
    """Start a per-parse cache scope shared by asyncio.gather child tasks."""
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


def _cache_parts(query: str, region_code: Optional[str], shape: str) -> tuple[str, str, str, str]:
    qn = normalize_query(query)
    rc = region_code or ""
    mv = mask_version(shape)
    return build_cache_key(qn, rc, mv), qn, rc, mv


async def _http_get_cache(cache_key: str) -> Optional[CacheEntry]:
    now_iso = datetime.now(timezone.utc).isoformat()
    params = {
        "cache_key": f"eq.{cache_key}",
        "expires_at": f"gt.{now_iso}",
        "select": "place_json,is_negative",
        "limit": "1",
    }
    async with httpx.AsyncClient(timeout=CACHE_READ_TIMEOUT) as client:
        resp = await client.get(f"{SUPABASE_URL}{_TABLE_PATH}", params=params, headers=_headers())
        resp.raise_for_status()
        rows = resp.json()
    if not rows:
        return None
    row = rows[0]
    return CacheEntry(place=row.get("place_json"), is_negative=bool(row.get("is_negative")))


async def _http_put_cache(
    cache_key: str,
    query_normalized: str,
    region_code: str,
    mask_version_str: str,
    entry: CacheEntry,
    expires_at_iso: str,
) -> None:
    body = {
        "cache_key": cache_key,
        "query_normalized": query_normalized,
        "region_code": region_code,
        "mask_version": mask_version_str,
        "place_json": entry.place,
        "is_negative": entry.is_negative,
        "expires_at": expires_at_iso,
    }
    headers = {**_headers(), "Prefer": "resolution=merge-duplicates,return=minimal"}
    async with httpx.AsyncClient(timeout=CACHE_WRITE_TIMEOUT) as client:
        resp = await client.post(f"{SUPABASE_URL}{_TABLE_PATH}", json=body, headers=headers)
        resp.raise_for_status()


async def _read_l2(key: str, scope: Optional[RequestScope]) -> Optional[CacheEntry]:
    try:
        return await _http_get_cache(key)
    except Exception as exc:  # noqa: BLE001 - cache failures must not break enrichment
        logger.warning("places_cache read failed | key=%s | error=%s", key, exc)
        if scope is not None:
            scope.errors += 1
        return None


async def _write_l2(
    key: str,
    query_normalized: str,
    region_code: str,
    mask_version_str: str,
    entry: CacheEntry,
    scope: Optional[RequestScope],
) -> None:
    try:
        await _http_put_cache(key, query_normalized, region_code, mask_version_str, entry, _expires_at(entry.is_negative))
    except Exception as exc:  # noqa: BLE001
        logger.warning("places_cache write failed | key=%s | error=%s", key, exc)
        if scope is not None:
            scope.errors += 1


async def lookup_or_resolve(
    query: str,
    region_code: Optional[str],
    shape: str,
    *,
    resolve: Callable[[], Awaitable[CacheEntry]],
) -> CacheEntry:
    """Return an accepted-place cache entry, resolving through Google on cache miss.

    Persistent cache stores only the place that our matcher accepted, not the whole
    Places Text Search candidate response. Empty Google candidate responses are
    negative-cached for a shorter TTL.
    """
    if not _cache_enabled():
        return await resolve()

    scope = current_scope()
    key, qn, rc, mv = _cache_parts(query, region_code, shape)

    if scope is not None:
        if key in scope.memo:
            scope.l1_hits += 1
            return scope.memo[key]
        in_flight = scope.in_flight.get(key)
        if in_flight is not None:
            scope.l1_hits += 1
            return await in_flight

    async def read_resolve_and_store() -> CacheEntry:
        cached = await _read_l2(key, scope)
        if cached is not None:
            if scope is not None:
                scope.memo[key] = cached
                scope.l2_hits += 1
            return cached

        if scope is not None:
            scope.misses += 1
        entry = await resolve()
        if scope is not None:
            scope.google_calls += 1

        if not entry.is_storable():
            return entry

        if scope is not None:
            scope.memo[key] = entry
            if entry.is_negative:
                scope.negatives += 1
        await _write_l2(key, qn, rc, mv, entry, scope)
        return entry

    if scope is None:
        return await read_resolve_and_store()

    task = asyncio.create_task(read_resolve_and_store())
    scope.in_flight[key] = task
    try:
        return await task
    finally:
        scope.in_flight.pop(key, None)
