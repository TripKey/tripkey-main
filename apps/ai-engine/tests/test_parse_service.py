from __future__ import annotations

import pytest

from app.schemas.parse import (
    Category,
    Classification,
    FlightInput,
    FlightRole,
    ParseRequest,
    PlacementStatus,
)
from app.prompts.core_parse import build_core_parse_prompt
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
        "도쿄타워 도쿄 japan",
        "東京タワー 미나토구",
        "東京タワー 도쿄",
        "東京タワー 도쿄 japan",
        "도쿄타워",
    ]


def test_query_candidates_prioritize_destination_when_location_is_missing() -> None:
    card = ParsedCard(
        name="이치란 라멘",
        category=Category.FOOD,
        classification=Classification.CONFIRMED,
        placement_status=PlacementStatus.READY_PARTIAL,
        is_ai_generated=False,
        allow_duplicate=False,
    )
    req = ParseRequest(
        trip_id="trip-1",
        dump_text="오사카 여행",
        destinations=["오사카"],
        travel_days=3,
        companion_count=2,
    )

    queries = core_parse._query_candidates(card, req)

    assert queries[0] == "이치란 라멘 오사카"
    assert queries[1] == "이치란 라멘 오사카 japan"
    assert queries[-1] == "이치란 라멘"


def test_query_candidates_use_destination_specific_country_hint() -> None:
    card = ParsedCard(
        name="루브르 박물관",
        category=Category.PLACE,
        classification=Classification.CONFIRMED,
        placement_status=PlacementStatus.READY_PARTIAL,
        is_ai_generated=False,
        allow_duplicate=False,
    )
    req = ParseRequest(
        trip_id="trip-1",
        dump_text="파리 여행",
        destinations=["파리"],
        travel_days=3,
        companion_count=2,
    )

    queries = core_parse._query_candidates(card, req)

    assert "루브르 박물관 파리 france" in queries
    assert all("japan" not in query.lower() for query in queries)


def test_query_candidates_use_all_destinations() -> None:
    card = ParsedCard(
        name="아라비카 커피 아라시야마 점",
        category=Category.FOOD,
        classification=Classification.CONFIRMED,
        placement_status=PlacementStatus.READY_PARTIAL,
        is_ai_generated=False,
        allow_duplicate=False,
    )
    req = ParseRequest(
        trip_id="trip-1",
        dump_text="아라비카 커피 아라시야마 점",
        destinations=["오사카", "교토시"],
        travel_days=3,
        companion_count=2,
    )

    queries = core_parse._query_candidates(card, req)

    assert "아라비카 커피 아라시야마 점 오사카" in queries
    assert "아라비카 커피 아라시야마 점 교토" in queries
    assert "아라비카 커피 아라시야마 점 교토 japan" in queries


def test_query_candidates_for_bangkok_landmark_are_not_japan_biased() -> None:
    card = ParsedCard(
        name="방콕 왕궁",
        category=Category.PLACE,
        classification=Classification.CONFIRMED,
        placement_status=PlacementStatus.READY_PARTIAL,
        is_ai_generated=False,
        allow_duplicate=False,
        search_alias="พระบรมมหาราชวัง",
    )
    req = ParseRequest(
        trip_id="trip-1",
        dump_text="방콕 왕궁은 꼭 가고 싶어",
        destinations=["방콕"],
        travel_days=3,
        companion_count=2,
    )

    queries = core_parse._query_candidates(card, req)

    assert "방콕 왕궁 방콕 thailand" in queries
    assert "พระบรมมหาราชวัง 방콕 thailand" in queries
    assert all("japan" not in query.lower() for query in queries)


def test_destination_region_codes_maps_supported_destinations() -> None:
    assert core_parse._destination_region_codes(["오사카"]) == ["jp"]
    assert core_parse._destination_region_codes(["오사카", "교토"]) == ["jp"]
    assert core_parse._destination_region_codes(["교토시"]) == ["jp"]
    assert core_parse._destination_region_codes(["뉴욕시"]) == ["us"]
    assert core_parse._destination_region_codes(["방콕", "파리", "제주"]) == ["th", "fr", "kr"]


def test_destination_hints_normalize_city_suffixes() -> None:
    hints = core_parse._destination_hints(["교토시"])

    assert "교토시" in hints
    assert "교토" in hints
    assert "kyoto" in hints
    assert "japan" in hints


def test_canonical_destination_does_not_substring_match_ambiguous_admin_names() -> None:
    assert core_parse._canonical_destination_name("경기도 광주시") == "경기도 광주시"


def test_core_parse_prompt_requires_destination_aware_responses() -> None:
    prompt = build_core_parse_prompt(
        ParseRequest(
            trip_id="trip-1",
            dump_text="방콕 여행인데 야시장과 루프탑바 추천도 있으면 좋겠어",
            destinations=["방콕"],
            travel_days=3,
            companion_count=2,
        )
    )

    assert "Do not assume Japan" in prompt
    assert "unless the destinations or dump_text clearly indicate Japan" in prompt
    assert "not just \"{landmark}\"" in prompt
    assert "create one undecided card for that requested type" in prompt
    assert "Treat requested recommendation types as user intent" in prompt
    assert "Do not satisfy a requested recommendation type by choosing only one concrete venue" in prompt
    assert "Generic recommendation/category cards must not be open_question" in prompt
    assert "classification Decision Tree" in prompt
    assert "Day placement alone must not promote it to confirmed" in prompt
    assert "Do not invent aliases for generic category cards or undecided cards" in prompt
    assert "Leave search_alias null when the card name is already the best searchable venue name" in prompt
    assert "broad recommendation cards" in prompt
    assert "subcategories/preferences" in prompt
    assert "Do not mix subcategory options and venue options" in prompt
    assert "must explain what is currently missing" in prompt
    assert "what kind of answer the user can provide" in prompt


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


def test_to_public_card_keeps_search_alias_for_backend_storage() -> None:
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

    assert public_card.model_dump()["search_alias"] == "東京タワー"


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
        raise AssertionError(
            "ParsedCard should inherit CardResponse question validation"
        )


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
    assert updated[0].flight_datetime == "2026-07-01T09:00:00+09:00"
    assert updated[0].flight_role == FlightRole.OUTBOUND


def test_apply_flight_constraints_sets_inbound_role_for_return_flight() -> None:
    cards = [
        ParsedCard(
            name="NRT → ICN",
            category=Category.TRANSPORT,
            classification=Classification.CONFIRMED,
            placement_status=PlacementStatus.READY_PARTIAL,
            is_ai_generated=False,
            allow_duplicate=True,
            flight_number="KE704",
        )
    ]
    req = ParseRequest(
        trip_id="trip-1",
        dump_text="도쿄 여행",
        destinations=["도쿄"],
        travel_days=3,
        companion_count=2,
        return_flight=FlightInput(
            departure_airport="NRT",
            arrival_airport="ICN",
            flight_number="KE704",
            datetime="2026-07-03T18:30:00+09:00",
        ),
    )

    updated = core_parse._apply_flight_constraints(cards, req)

    assert updated[0].time_constraint == "18:30 출발"
    assert updated[0].flight_datetime == "2026-07-03T18:30:00+09:00"
    assert updated[0].flight_role == FlightRole.INBOUND


def test_apply_flight_constraints_preserves_existing_time_constraint() -> None:
    cards = [
        ParsedCard(
            name="ICN → NRT",
            category=Category.TRANSPORT,
            classification=Classification.CONFIRMED,
            placement_status=PlacementStatus.READY_PARTIAL,
            is_ai_generated=False,
            allow_duplicate=True,
            time_constraint="오전 출발",
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

    assert updated[0].time_constraint == "오전 출발"
    assert updated[0].flight_datetime == "2026-07-01T09:00:00+09:00"
    assert updated[0].flight_role == FlightRole.OUTBOUND


def test_apply_flight_constraints_leaves_middle_flight_without_role_when_unmatched() -> None:
    cards = [
        ParsedCard(
            name="ITM → CTS",
            category=Category.TRANSPORT,
            classification=Classification.CONFIRMED,
            placement_status=PlacementStatus.READY_PARTIAL,
            is_ai_generated=False,
            allow_duplicate=True,
            flight_number="JL200",
            flight_datetime="2026-07-03T14:20:00+09:00",
            flight_role=FlightRole.OUTBOUND,
        )
    ]
    req = ParseRequest(
        trip_id="trip-1",
        dump_text="도쿄와 삿포로 여행",
        destinations=["도쿄", "삿포로"],
        travel_days=5,
        companion_count=2,
        departure_flight=FlightInput(
            departure_airport="ICN",
            arrival_airport="NRT",
            flight_number="KE703",
            datetime="2026-07-01T09:00:00+09:00",
        ),
        return_flight=FlightInput(
            departure_airport="CTS",
            arrival_airport="ICN",
            flight_number="KE766",
            datetime="2026-07-05T20:00:00+09:00",
        ),
    )

    updated = core_parse._apply_flight_constraints(cards, req)

    assert updated[0].time_constraint is None
    assert updated[0].flight_datetime == "2026-07-03T14:20:00+09:00"
    assert updated[0].flight_role is None


def test_apply_flight_constraints_nulls_non_iso_flight_datetime() -> None:
    cards = [
        ParsedCard(
            name="KE703",
            category=Category.TRANSPORT,
            classification=Classification.CONFIRMED,
            placement_status=PlacementStatus.READY_PARTIAL,
            is_ai_generated=False,
            allow_duplicate=True,
            flight_number="KE703",
            flight_datetime="7월 1일 오전 9시",
        )
    ]
    req = _request()

    updated = core_parse._apply_flight_constraints(cards, req)

    assert updated[0].flight_datetime is None


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


def test_parse_cards_normalizes_generic_ai_open_question_to_needs_input() -> None:
    raw_cards = [
        {
            "name": "오사카 맛집",
            "category": "food",
            "classification": "open_question",
            "placement_status": "ready_partial",
            "is_ai_generated": True,
            "allow_duplicate": False,
            "estimated_duration_min": 60,
            "place_id": None,
            "coordinates": None,
            "address": None,
            "question_text": None,
            "options": None,
        }
    ]

    cards = core_parse._parse_cards(raw_cards)

    assert len(cards) == 1
    assert cards[0].classification == Classification.UNDECIDED
    assert cards[0].placement_status == PlacementStatus.NEEDS_INPUT
    assert cards[0].question_text == (
        "오사카 맛집을(를) 일정에 넣으려면 선호하는 메뉴, 동네, 예산, 또는 특정 매장명이 필요해요. "
        "어떤 기준으로 찾을까요?"
    )
    assert cards[0].options is None


def test_parse_cards_normalizes_generic_ai_open_question_with_options_to_selectable() -> None:
    raw_cards = [
        {
            "name": "Bangkok restaurants",
            "category": "food",
            "classification": "open_question",
            "placement_status": "ready_partial",
            "is_ai_generated": True,
            "allow_duplicate": False,
            "estimated_duration_min": 60,
            "place_id": None,
            "coordinates": None,
            "address": None,
            "question_text": None,
            "options": ["Nai Mong Hoi Thod", "Jay Fai"],
        }
    ]

    cards = core_parse._parse_cards(raw_cards)

    assert len(cards) == 1
    assert cards[0].classification == Classification.UNDECIDED
    assert cards[0].placement_status == PlacementStatus.READY_PARTIAL
    assert cards[0].question_text == "Bangkok restaurants 후보를 몇 곳 찾았어요. 이 중 일정에 넣고 싶은 곳을 선택해 주세요."
    assert cards[0].options == ["Nai Mong Hoi Thod", "Jay Fai"]


def test_parse_cards_uses_subcategory_question_for_broad_food_options() -> None:
    raw_cards = [
        {
            "name": "음식점 추천",
            "category": "food",
            "classification": "open_question",
            "placement_status": "ready_partial",
            "is_ai_generated": True,
            "allow_duplicate": False,
            "estimated_duration_min": 60,
            "place_id": None,
            "coordinates": None,
            "address": None,
            "question_text": None,
            "options": ["스시", "라멘", "오코노미야키", "카페"],
        }
    ]

    cards = core_parse._parse_cards(raw_cards)

    assert len(cards) == 1
    assert cards[0].classification == Classification.UNDECIDED
    assert cards[0].placement_status == PlacementStatus.READY_PARTIAL
    assert cards[0].question_text == (
        "음식점 추천은(는) 아직 범위가 넓어요. 먼저 원하는 종류나 분위기를 골라주시면 "
        "그에 맞는 구체 장소 후보를 좁힐게요."
    )
    assert cards[0].options == ["스시", "라멘", "오코노미야키", "카페"]


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


def test_place_matches_destination_context_rejects_wrong_country_result() -> None:
    req = ParseRequest(
        trip_id="trip-1",
        dump_text="오사카 여행",
        destinations=["오사카"],
        travel_days=3,
        companion_count=2,
    )
    place = {
        "displayName": {"text": "이치란 라멘"},
        "formattedAddress": "271 Gangseo-ro, Gangseo-gu, Seoul, South Korea",
    }

    assert core_parse._place_matches_destination_context(place, req) is False


def test_place_matches_destination_context_accepts_normalized_city_suffix() -> None:
    req = ParseRequest(
        trip_id="trip-1",
        dump_text="교토시 여행",
        destinations=["오사카", "교토시"],
        travel_days=3,
        companion_count=2,
    )
    place = {
        "displayName": {"text": "% ARABICA Kyoto Arashiyama"},
        "formattedAddress": "3-47 Sagatenryuji Susukinobabacho, Ukyo Ward, Kyoto, 616-8385",
    }

    assert core_parse._place_matches_destination_context(place, req) is True


@pytest.mark.asyncio
async def test_enrich_card_accepts_single_destination_scoped_landmark_result() -> None:
    seen_queries: list[str] = []

    async def fake_search_place(
        query: str, api_key: str, region_code: str | None = None
    ) -> dict | None:
        seen_queries.append(query)
        if query == "루브르 박물관 파리 france":
            return {
                "places": [
                    {
                        "id": "louvre-place",
                        "displayName": {"text": "Louvre Museum"},
                        "formattedAddress": "Rue de Rivoli, 75001 Paris, France",
                        "shortFormattedAddress": "Paris, France",
                        "location": {"latitude": 48.8606, "longitude": 2.3376},
                    }
                ]
            }
        return {"places": []}

    original = core_parse._search_place
    core_parse._search_place = fake_search_place
    try:
        card = ParsedCard(
            name="루브르 박물관",
            category=Category.PLACE,
            classification=Classification.CONFIRMED,
            placement_status=PlacementStatus.READY_PARTIAL,
            is_ai_generated=False,
            allow_duplicate=False,
        )
        req = ParseRequest(
            trip_id="trip-1",
            dump_text="파리 여행에서 루브르 박물관은 예약했어",
            destinations=["파리"],
            travel_days=5,
            companion_count=2,
        )

        updated = await core_parse._enrich_card(card, req, "test-key")

        assert "루브르 박물관 파리 france" in seen_queries
        assert updated.place_id == "louvre-place"
        assert updated.address == "Rue de Rivoli, 75001 Paris, France"
        assert updated.coordinates is not None
    finally:
        core_parse._search_place = original


@pytest.mark.asyncio
async def test_enrich_card_skips_undecided_lookup() -> None:
    called = False

    async def fake_search_place(
        query: str, api_key: str, region_code: str | None = None
    ) -> dict | None:
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


@pytest.mark.asyncio
async def test_enrich_card_skips_generic_ai_open_question_lookup() -> None:
    called = False

    async def fake_search_place(
        query: str, api_key: str, region_code: str | None = None
    ) -> dict | None:
        nonlocal called
        called = True
        return {"places": []}

    original = core_parse._search_place
    core_parse._search_place = fake_search_place
    try:
        card = ParsedCard(
            name="Paris attractions",
            category=Category.PLACE,
            classification=Classification.OPEN_QUESTION,
            placement_status=PlacementStatus.READY_PARTIAL,
            is_ai_generated=True,
            allow_duplicate=False,
        )

        updated = await core_parse._enrich_card(card, _request(), "test-key")

        assert updated == card
        assert called is False
    finally:
        core_parse._search_place = original


@pytest.mark.asyncio
async def test_enrich_card_rejects_name_match_when_destination_mismatches() -> None:
    seen_region_codes: list[str | None] = []

    async def fake_search_place(
        query: str, api_key: str, region_code: str | None = None
    ) -> dict | None:
        seen_region_codes.append(region_code)
        return {
            "places": [
                {
                    "id": "wrong-country-place",
                    "displayName": {"text": "이치란 라멘"},
                    "formattedAddress": "271 Gangseo-ro, Gangseo-gu, Seoul, South Korea",
                    "location": {"latitude": 37.5499564, "longitude": 126.8359413},
                }
            ]
        }

    original = core_parse._search_place
    core_parse._search_place = fake_search_place
    try:
        card = ParsedCard(
            name="이치란 라멘",
            category=Category.FOOD,
            classification=Classification.CONFIRMED,
            placement_status=PlacementStatus.READY_PARTIAL,
            is_ai_generated=False,
            allow_duplicate=False,
            user_context="이치란 라멘을 먹고 싶다고 언급하셨어요.",
        )
        req = ParseRequest(
            trip_id="trip-1",
            dump_text="오사카 3박 4일 여행",
            destinations=["오사카"],
            travel_days=3,
            companion_count=2,
        )

        updated = await core_parse._enrich_card(card, req, "test-key")

        assert updated.place_id is None
        assert updated.coordinates is None
        assert "장소 정보를 확인해주세요." in (updated.user_context or "")
        assert seen_region_codes
        assert all(region_code == "jp" for region_code in seen_region_codes)
    finally:
        core_parse._search_place = original


@pytest.mark.asyncio
async def test_enrich_card_caches_accepted_place(monkeypatch) -> None:
    from app.services import places_cache

    store: dict = {}

    async def fake_get(cache_key):
        return store.get(cache_key)

    async def fake_put(cache_key, qn, rc, mv, entry, expires_at_iso):
        store[cache_key] = entry

    google_calls = {"n": 0}

    async def fake_search(query, api_key, region_code=None):
        google_calls["n"] += 1
        return {
            "places": [
                {
                    "id": "p1",
                    "displayName": {"text": "도쿄타워"},
                    "formattedAddress": "4 Chome-2-8 Shibakoen, Minato City, Tokyo",
                    "shortFormattedAddress": "Tokyo Tower",
                    "location": {"latitude": 35.6586, "longitude": 139.7454},
                }
            ]
        }

    monkeypatch.setattr(places_cache, "PLACES_CACHE_ENABLED", True)
    monkeypatch.setattr(places_cache, "SUPABASE_URL", "https://proj.supabase.co")
    monkeypatch.setattr(places_cache, "SUPABASE_SERVICE_ROLE_KEY", "svc-key")
    monkeypatch.setattr(places_cache, "_http_get_cache", fake_get)
    monkeypatch.setattr(places_cache, "_http_put_cache", fake_put)
    monkeypatch.setattr(core_parse, "_search_place", fake_search)
    places_cache.begin_scope()

    card = ParsedCard(
        name="도쿄타워",
        category=Category.PLACE,
        classification=Classification.CONFIRMED,
        placement_status=PlacementStatus.READY_PARTIAL,
        is_ai_generated=False,
        allow_duplicate=False,
    )

    first = await core_parse._enrich_card(card, _request(), "key")
    second = await core_parse._enrich_card(card, _request(), "key")

    assert first.place_id == second.place_id == "p1"
    assert first.coordinates is not None
    assert google_calls["n"] == 1


@pytest.mark.asyncio
async def test_enrich_cards_blocking_starts_cache_scope(monkeypatch) -> None:
    began = {"n": 0}

    monkeypatch.setattr(
        core_parse.places_cache, "begin_scope", lambda: began.__setitem__("n", began["n"] + 1)
    )
    monkeypatch.setattr(core_parse.places_cache, "log_summary", lambda: None)
    monkeypatch.setattr(core_parse, "_places_api_key", lambda: "test-key")

    async def fake_enrich(card, req, api_key):
        return card

    monkeypatch.setattr(core_parse, "_enrich_card", fake_enrich)

    card = ParsedCard(
        name="도쿄타워",
        category=Category.PLACE,
        classification=Classification.CONFIRMED,
        placement_status=PlacementStatus.READY_PARTIAL,
        is_ai_generated=False,
        allow_duplicate=False,
    )

    out = await core_parse.enrich_cards_blocking(_request(), [card])

    assert began["n"] == 1
    assert out == [card]
