from __future__ import annotations

import json

import pytest

from app.schemas.chat_parse import ChatContext, ChatParseRequest, ExistingCardSummary
from app.schemas.parse import Coordinates
from app.services import chat_parse


def _request(max_cards: int = 3) -> ChatParseRequest:
    return ChatParseRequest(
        trip_id="trip-1",
        message="비 오는 날 실내 장소 추천해줘",
        destinations=["오사카"],
        travel_days=3,
        companion_count=2,
        context=ChatContext(interests=["food"], constraints=["low_walking"]),
        max_cards=max_cards,
    )


def _raw_card(name: str, category: str = "place") -> dict:
    return {
        "name": name,
        "category": category,
        "estimated_duration_min": 60,
        "user_context": "비 오는 날 실내 활동",
    }


def _mock_gemini(monkeypatch: pytest.MonkeyPatch, payload: dict) -> None:
    monkeypatch.setattr(chat_parse, "_call_gemini", lambda _prompt: json.dumps(payload, ensure_ascii=False))


@pytest.mark.asyncio
@pytest.mark.parametrize("intent", ["update_context", "need_clarification", "no_action"])
async def test_non_generate_intents_discard_cards(monkeypatch: pytest.MonkeyPatch, intent: str) -> None:
    _mock_gemini(
        monkeypatch,
        {
            "intent": intent,
            "reply": "확인했어요.",
            "updated_context": {"interests": ["food"], "constraints": ["low_walking"]},
            "cards": [_raw_card("오사카 역사박물관")],
        },
    )

    response = await chat_parse.parse_chat(_request())

    assert response.intent == intent
    assert response.cards == []


@pytest.mark.asyncio
async def test_unknown_intent_falls_back_to_clarification(monkeypatch: pytest.MonkeyPatch) -> None:
    _mock_gemini(monkeypatch, {"intent": "unknown", "cards": [_raw_card("장소")]})

    response = await chat_parse.parse_chat(_request())

    assert response.intent == "need_clarification"
    assert response.cards == []
    assert response.reply == chat_parse.FALLBACK_REPLIES["need_clarification"]


@pytest.mark.asyncio
async def test_explicit_existing_place_uses_arrangement_duplicate_guidance(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _mock_gemini(
        monkeypatch,
        {
            "intent": "no_action",
            "reply": "직접 추가해주세요.",
            "cards": [],
            "duplicates": [],
        },
    )
    req = _request()
    req = req.model_copy(
        update={
            "message": "쿠로몬 시장도 다시 넣어줘",
            "existing_cards": [
                ExistingCardSummary(
                    name="쿠로몬 시장",
                    category="food",
                    location="난바",
                    place_id="place-1",
                )
            ],
        }
    )

    response = await chat_parse.parse_chat(req)

    assert [item.name for item in response.duplicates] == ["쿠로몬 시장"]
    assert response.reply == chat_parse.DUPLICATE_ONLY_REPLY


@pytest.mark.asyncio
async def test_invalid_and_forbidden_cards_are_dropped_before_limit(monkeypatch: pytest.MonkeyPatch) -> None:
    _mock_gemini(
        monkeypatch,
        {
            "intent": "generate_cards",
            "reply": "찾아봤어요.",
            "cards": [
                _raw_card("호텔", "accommodation"),
                _raw_card("공항철도", "transport"),
                {"category": "place"},
                _raw_card("오사카 역사박물관"),
            ],
        },
    )

    captured: list[str] = []

    async def enrich(_req, cards):
        captured.extend(card.name for card in cards)
        return [
            card.model_copy(
                update={"place_id": "place-1", "coordinates": Coordinates(lat=34.68, lng=135.52)}
            )
            for card in cards
        ]

    monkeypatch.setattr(chat_parse, "enrich_cards_blocking", enrich)

    response = await chat_parse.parse_chat(_request(max_cards=2))

    assert captured == ["오사카 역사박물관"]
    assert [card.name for card in response.cards] == ["오사카 역사박물관"]
    assert response.cards[0].classification.value == "open_question"
    assert response.cards[0].placement_status.value == "ready"
    assert response.cards[0].question_text is None
    assert response.cards[0].is_ai_generated is True


@pytest.mark.asyncio
async def test_unmatched_and_invalid_coordinates_use_zero_card_fallback(monkeypatch: pytest.MonkeyPatch) -> None:
    _mock_gemini(
        monkeypatch,
        {"intent": "generate_cards", "reply": "찾아봤어요.", "cards": [_raw_card("장소 A")]},
    )

    async def enrich(_req, cards):
        return [
            cards[0].model_copy(
                update={"place_id": "place-1", "coordinates": Coordinates(lat=91, lng=135)}
            )
        ]

    monkeypatch.setattr(chat_parse, "enrich_cards_blocking", enrich)

    response = await chat_parse.parse_chat(_request())

    assert response.cards == []
    assert response.reply == chat_parse.NO_MATCH_REPLY
    assert "지역이나 시간대" in response.reply


@pytest.mark.asyncio
async def test_context_and_duplicates_are_normalized(monkeypatch: pytest.MonkeyPatch) -> None:
    _mock_gemini(
        monkeypatch,
        {
            "intent": "update_context",
            "updated_context": {
                "interests": [" food ", "FOOD", "x" * 101, "shopping"],
                "constraints": ["minimal walking", "indoor_friendly", "unknown"],
            },
            "duplicates": [
                {"name": " 쿠로몬 시장 ", "reason": "already_exists"},
                {"name": "쿠로몬 시장", "reason": "already_exists"},
                {"name": "잘못된 값", "reason": "other"},
            ],
        },
    )

    response = await chat_parse.parse_chat(_request())

    assert response.updated_context.interests == ["food", "shopping"]
    assert response.updated_context.constraints == ["low_walking", "indoor_focused"]
    assert [item.name for item in response.duplicates] == ["쿠로몬 시장"]
