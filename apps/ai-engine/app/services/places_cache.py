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
