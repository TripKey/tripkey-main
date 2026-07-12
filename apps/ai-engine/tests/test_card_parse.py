import json

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.prompts.card_parse import build_card_parse_prompt
from app.schemas.card_parse import CardParseRequest, CardParseSnapshot
from app.schemas.parse import Category, Classification, PlacementStatus
from app.services import core_parse


def test_card_parse_prompt_requires_helpful_needs_input_questions() -> None:
    prompt = build_card_parse_prompt(
        CardParseRequest(
            trip_id="trip-1",
            destinations=["오사카"],
            travel_days=3,
            companion_count=2,
            natural_language_input="친구집 갈래",
            card=CardParseSnapshot(
                name="방문 장소",
                category=Category.PLACE,
                classification=Classification.UNDECIDED,
                placement_status=PlacementStatus.NEEDS_INPUT,
                question_text="방문할 장소를 더 구체적으로 알려주세요.",
            ),
        )
    )

    assert "what is missing" in prompt
    assert "what kind of answer the user can provide" in prompt
    assert "Avoid generic one-liners" in prompt
    assert "user chooses a subtype/preference option" in prompt
    assert "not merely a subtype" in prompt


@pytest.mark.asyncio
async def test_card_parse_endpoint_returns_confirmed_card(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_call_gemini(prompt: str, model_name: str = "gemini-2.5-flash") -> str:
        return json.dumps(
                {
                    "instance_id": "card-1",
                    "name": "키지",
                "category": "food",
                "classification": "confirmed",
                "placement_status": "ready_partial",
                "is_ai_generated": False,
                "allow_duplicate": False,
                "estimated_duration_min": 60,
                "place_id": "should-be-cleared",
                "coordinates": {"lat": 1.0, "lng": 2.0},
                "location": "오사카",
                "address": "should-be-cleared",
                "time_constraint": None,
                "question_text": None,
                "options": None,
                "blocked_reason": None,
                "user_context": "오사카의 키지 오코노미야끼 방문을 확정했어요.",
                "tips": "대기 시간이 있을 수 있어요.",
                "tags": ["오코노미야끼"],
                "source": "ai_parse",
                "check_in": None,
                "check_out": None,
                "flight_number": None,
                "flight_datetime": None,
                "flight_role": None,
                "search_alias": "Kiji Okonomiyaki Osaka",
            },
            ensure_ascii=False,
        )

    monkeypatch.setattr(core_parse, "_call_gemini", fake_call_gemini)
    monkeypatch.setattr(core_parse, "_places_api_key", lambda: None)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/internal/ai/parse/card",
            json={
                "trip_id": "trip-1",
                "destinations": ["오사카"],
                "travel_days": 3,
                "companion_count": 2,
                "natural_language_input": "오사카에 있는 키지 오코노미야끼 집으로 갈거야",
                "card": {
                    "instance_id": "card-1",
                    "name": "오코노미야끼 맛집",
                    "category": "food",
                    "classification": "undecided",
                    "placement_status": "ready_partial",
                    "question_text": "오사카에서 방문하고 싶은 오코노미야끼 맛집을 추천해 드릴까요?",
                    "options": ["치보", "후쿠타로", "미즈노", "키지"],
                },
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "키지"
    assert body["classification"] == "confirmed"
    assert body["placement_status"] == "ready_partial"
    assert body["place_id"] is None
    assert body["coordinates"] is None
    assert body["address"] is None
    assert body["question_text"] is None
    assert body["options"] is None
    assert body["search_alias"] == "Kiji Okonomiyaki Osaka"


@pytest.mark.asyncio
async def test_card_parse_endpoint_runs_places_enrichment(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_call_gemini(prompt: str, model_name: str = "gemini-2.5-flash") -> str:
        return json.dumps(
            {
                "name": "키지",
                "category": "food",
                "classification": "confirmed",
                "placement_status": "ready_partial",
                "is_ai_generated": False,
                "allow_duplicate": False,
                "estimated_duration_min": 60,
                "place_id": None,
                "coordinates": None,
                "location": "오사카",
                "address": None,
                "time_constraint": None,
                "question_text": None,
                "options": None,
                "blocked_reason": None,
                "user_context": "오사카의 키지 오코노미야끼 방문을 확정했어요.",
                "tips": "대기 시간이 있을 수 있어요.",
                "tags": ["오코노미야끼"],
                "source": "ai_parse",
                "check_in": None,
                "check_out": None,
                "flight_number": None,
                "flight_datetime": None,
                "flight_role": None,
                "search_alias": "Kiji Okonomiyaki Osaka",
            },
            ensure_ascii=False,
        )

    async def fake_search_place(
        query: str, api_key: str, region_code: str | None = None
    ) -> dict | None:
        if query == "Kiji Okonomiyaki Osaka 오사카 japan":
            return {
                "places": [
                    {
                        "id": "kiji-place",
                        "displayName": {"text": "Kiji"},
                        "formattedAddress": "Japan, Osaka, Kita Ward",
                        "shortFormattedAddress": "Osaka, Japan",
                        "location": {"latitude": 34.7011, "longitude": 135.4959},
                    }
                ]
            }
        return {"places": []}

    monkeypatch.setattr(core_parse, "_call_gemini", fake_call_gemini)
    monkeypatch.setattr(core_parse, "_places_api_key", lambda: "test-key")
    monkeypatch.setattr(core_parse, "_search_place", fake_search_place)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/internal/ai/parse/card",
            json={
                "trip_id": "trip-1",
                "destinations": ["오사카"],
                "travel_days": 3,
                "companion_count": 2,
                "natural_language_input": "오사카에 있는 키지 오코노미야끼 집으로 갈거야",
                "card": {
                    "instance_id": "card-1",
                    "name": "오코노미야끼 맛집",
                    "category": "food",
                    "classification": "undecided",
                    "placement_status": "ready_partial",
                },
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["place_id"] == "kiji-place"
    assert body["coordinates"] == {"lat": 34.7011, "lng": 135.4959}
    assert body["address"] == "Japan, Osaka, Kita Ward"


@pytest.mark.asyncio
async def test_card_parse_endpoint_can_return_non_confirmed_card(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_call_gemini(prompt: str, model_name: str = "gemini-2.5-flash") -> str:
        return json.dumps(
            {
                "name": "장소 미정",
                "category": "etc",
                "classification": "undecided",
                "placement_status": "needs_input",
                "is_ai_generated": False,
                "allow_duplicate": False,
                "estimated_duration_min": None,
                "place_id": None,
                "coordinates": None,
                "location": None,
                "address": None,
                "time_constraint": None,
                "question_text": "방문할 장소를 더 구체적으로 알려주세요.",
                "options": None,
                "blocked_reason": None,
                "user_context": "입력만으로는 구체적인 장소를 특정하기 어려워요.",
                "tips": None,
                "tags": [],
                "source": "ai_parse",
                "check_in": None,
                "check_out": None,
                "flight_number": None,
                "flight_datetime": None,
                "flight_role": None,
                "search_alias": None,
            },
            ensure_ascii=False,
        )

    monkeypatch.setattr(core_parse, "_call_gemini", fake_call_gemini)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/internal/ai/parse/card",
            json={
                "trip_id": "trip-1",
                "destinations": ["오사카"],
                "natural_language_input": "아무데나",
                "card": {
                    "instance_id": "card-1",
                    "name": "친구집",
                    "category": "place",
                    "classification": "undecided",
                    "placement_status": "needs_input",
                },
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["classification"] == "undecided"
    assert body["placement_status"] == "needs_input"
    assert body["question_text"]


# ── #292 영업시간 정규화 ─────────────────────────────────────


def test_normalize_opening_hours_basic() -> None:
    from app.services.core_parse import _normalize_opening_hours

    raw = {
        "periods": [
            {"open": {"day": 1, "hour": 10, "minute": 0}, "close": {"day": 1, "hour": 18, "minute": 30}},
            {"open": {"day": 1, "hour": 19, "minute": 0}, "close": {"day": 1, "hour": 22, "minute": 0}},
            {"open": {"day": 2, "hour": 9, "minute": 0}, "close": {"day": 2, "hour": 17, "minute": 0}},
        ]
    }
    got = _normalize_opening_hours(raw)
    assert got == {
        "1": [["10:00", "18:30"], ["19:00", "22:00"]],
        "2": [["09:00", "17:00"]],
    }


def test_normalize_opening_hours_overnight_truncated() -> None:
    from app.services.core_parse import _normalize_opening_hours

    # 금요일 18:00 ~ 토요일 02:00 → open 요일(5)의 23:59 로 절단
    raw = {"periods": [{"open": {"day": 5, "hour": 18, "minute": 0}, "close": {"day": 6, "hour": 2, "minute": 0}}]}
    assert _normalize_opening_hours(raw) == {"5": [["18:00", "23:59"]]}


def test_normalize_opening_hours_24h_and_invalid() -> None:
    from app.services.core_parse import _normalize_opening_hours

    # close 없는 단일 period = 24시간 영업 → 전 요일 00:00~23:59
    raw_24h = {"periods": [{"open": {"day": 0, "hour": 0, "minute": 0}}]}
    got = _normalize_opening_hours(raw_24h)
    assert got is not None and set(got) == {str(d) for d in range(7)}
    assert got["3"] == [["00:00", "23:59"]]

    assert _normalize_opening_hours(None) is None
    assert _normalize_opening_hours({}) is None
    assert _normalize_opening_hours({"periods": []}) is None
    assert _normalize_opening_hours({"weekdayDescriptions": ["..."]}) is None
