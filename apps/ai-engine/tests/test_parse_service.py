from __future__ import annotations

from app.schemas.parse import Category, Classification, ParseRequest, PlacementStatus
from app.services import core_parse
from app.services.core_parse import ParsedCard, to_public_card


def _request() -> ParseRequest:
    return ParseRequest(
        trip_id="trip-1",
        dump_text="도쿄타워 가고 싶어",
        destinations=["도쿄"],
        travel_days=3,
        companion_count=2,
    )


def test_query_candidates_include_alias_fallbacks() -> None:
    card = ParsedCard(
        name="도쿄타워",
        category=Category.PLACE,
        classification=Classification.CONFIRMED,
        placement_status=PlacementStatus.READY_PARTIAL,
        is_ai_generated=False,
        allow_duplicate=False,
        location="미나토구",
        search_alias="東京タワー",
    )

    queries = core_parse._query_candidates(card, _request())

    assert queries == [
        "도쿄타워 미나토구",
        "도쿄타워 도쿄",
        "東京タワー 미나토구",
        "東京タワー 도쿄",
    ]


def test_name_match_accepts_search_alias() -> None:
    card = ParsedCard(
        name="도쿄타워",
        category=Category.PLACE,
        classification=Classification.CONFIRMED,
        placement_status=PlacementStatus.READY_PARTIAL,
        is_ai_generated=False,
        allow_duplicate=False,
        search_alias="東京タワー",
    )

    assert core_parse._is_name_match(card, "東京タワー")


def test_name_match_rejects_unrelated_result() -> None:
    card = ParsedCard(
        name="도쿄타워",
        category=Category.PLACE,
        classification=Classification.CONFIRMED,
        placement_status=PlacementStatus.READY_PARTIAL,
        is_ai_generated=False,
        allow_duplicate=False,
        search_alias="東京タワー",
    )

    assert not core_parse._is_name_match(card, "도쿄 디즈니랜드")


def test_to_public_card_drops_search_alias() -> None:
    card = ParsedCard(
        name="도쿄타워",
        category=Category.PLACE,
        classification=Classification.CONFIRMED,
        placement_status=PlacementStatus.READY_PARTIAL,
        is_ai_generated=False,
        allow_duplicate=False,
        search_alias="東京タワー",
    )

    public_card = to_public_card(card)

    assert "search_alias" not in public_card.model_dump()


def test_undecided_ready_partial_requires_options() -> None:
    try:
        ParsedCard(
            name="스시",
            category=Category.FOOD,
            classification=Classification.UNDECIDED,
            placement_status=PlacementStatus.READY_PARTIAL,
            is_ai_generated=False,
            allow_duplicate=False,
            question_text="어떤 스시를 먹고 싶으세요?",
            options=None,
        )
    except ValueError:
        pass
    else:
        raise AssertionError("undecided ready_partial cards must require options")
