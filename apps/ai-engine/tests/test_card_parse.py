import json

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.services import core_parse


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
