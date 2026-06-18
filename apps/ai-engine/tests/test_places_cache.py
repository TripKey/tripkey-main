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
