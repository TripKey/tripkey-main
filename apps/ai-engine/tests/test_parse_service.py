from __future__ import annotations

from app.schemas.parse import Category, Classification, FlightInput, ParseRequest, PlacementStatus
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


def test_parsed_card_inherits_question_validation() -> None:
    try:
        ParsedCard(
            name="도쿄타워",
            category=Category.PLACE,
            classification=Classification.CONFIRMED,
            placement_status=PlacementStatus.READY_PARTIAL,
            is_ai_generated=False,
            allow_duplicate=False,
            question_text="질문",
        )
    except ValueError:
        pass
    else:
        raise AssertionError("ParsedCard should inherit CardResponse question validation")


def test_sanitize_needs_input_cards_clears_location_fields() -> None:
    cards = [
        ParsedCard(
            name="친구네 집",
            category=Category.ACCOMMODATION,
            classification=Classification.UNDECIDED,
            placement_status=PlacementStatus.NEEDS_INPUT,
            is_ai_generated=False,
            allow_duplicate=True,
            question_text="어느 친구집에 가시나요?",
            location="수원",
            place_id="abc",
            address="수원 주소",
        )
    ]

    sanitized = core_parse._sanitize_needs_input_cards(cards)

    assert sanitized[0].location is None
    assert sanitized[0].place_id is None
    assert sanitized[0].address is None
    assert sanitized[0].coordinates is None


def test_apply_flight_constraints_sets_time_constraint() -> None:
    cards = [
        ParsedCard(
            name="ICN → NRT",
            category=Category.TRANSPORT,
            classification=Classification.CONFIRMED,
            placement_status=PlacementStatus.READY_PARTIAL,
            is_ai_generated=False,
            allow_duplicate=True,
            flight_number="KE703",
        )
    ]
    req = ParseRequest(
        trip_id="trip-1",
        dump_text="도쿄 여행",
        destinations=["도쿄"],
        travel_days=3,
        companion_count=2,
        departure_flight=FlightInput(
            departure_airport="ICN",
            arrival_airport="NRT",
            flight_number="KE703",
            datetime="2026-07-01T09:00:00+09:00",
        ),
    )

    updated = core_parse._apply_flight_constraints(cards, req)

    assert updated[0].time_constraint == "09:00 출발"


def test_ensure_card_name_infers_from_question_text() -> None:
    raw = {
        "name": None,
        "category": "food",
        "classification": "undecided",
        "placement_status": "ready_partial",
        "is_ai_generated": False,
        "allow_duplicate": False,
        "question_text": "어떤 오코노미야끼 맛집에 방문하시겠어요?",
        "options": ["치보", "후쿠타로"],
    }

    normalized = core_parse._ensure_card_name(raw)

    assert normalized["name"] == "오코노미야끼 맛집"


def test_apply_place_match_keeps_original_name() -> None:
    card = ParsedCard(
        name="도톤보리",
        category=Category.PLACE,
        classification=Classification.CONFIRMED,
        placement_status=PlacementStatus.READY_PARTIAL,
        is_ai_generated=False,
        allow_duplicate=False,
    )
    place = {
        "id": "place-1",
        "displayName": {"text": "Dotonbori"},
        "formattedAddress": "Osaka",
        "location": {"latitude": 34.0, "longitude": 135.0},
    }

    updated = core_parse._apply_place_match(card, place)

    assert updated.name == "도톤보리"
    assert updated.place_id == "place-1"


async def test_enrich_card_skips_undecided_lookup() -> None:
    called = False

    async def fake_search_place(query: str, api_key: str) -> dict | None:
        nonlocal called
        called = True
        return {"places": []}

    original = core_parse._search_place
    core_parse._search_place = fake_search_place
    try:
        card = ParsedCard(
            name="스시",
            category=Category.FOOD,
            classification=Classification.UNDECIDED,
            placement_status=PlacementStatus.READY_PARTIAL,
            is_ai_generated=False,
            allow_duplicate=False,
            question_text="어떤 스시집에 가시겠어요?",
            options=["스시 다이", "스시잔마이"],
        )

        updated = await core_parse._enrich_card(card, _request(), "test-key")

        assert updated == card
        assert called is False
    finally:
        core_parse._search_place = original
