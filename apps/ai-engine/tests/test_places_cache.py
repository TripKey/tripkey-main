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
