from __future__ import annotations

import asyncio
import logging
import math
import re
from typing import Any

from app.prompts.chat_parse import build_chat_parse_prompt
from app.schemas.chat_parse import (
    ChatContext,
    ChatParseRequest,
    ChatParseResponse,
    DuplicateItem,
)
from app.schemas.parse import CardResponse, Category, ParseRequest, PlacementStatus
from app.services.core_parse import (
    ParsedCard,
    _call_gemini,
    _extract_json,
    enrich_cards_blocking,
)

logger = logging.getLogger(__name__)

VALID_INTENTS = {
    "update_context",
    "generate_cards",
    "need_clarification",
    "no_action",
}
FALLBACK_REPLIES = {
    "update_context": "말씀해주신 여행 취향을 반영할게요.",
    "generate_cards": "조건에 맞는 장소를 찾아봤어요.",
    "need_clarification": "원하시는 장소를 조금 더 구체적으로 말씀해주시겠어요?",
    "no_action": "알겠어요. 다른 장소가 필요하면 말씀해주세요.",
}
NO_MATCH_REPLY = (
    "실제 장소로 확인할 수 있는 추천 후보를 찾지 못했어요. "
    "지역이나 시간대, 원하는 활동을 조금 더 구체적으로 알려주세요. "
    "예: ‘난바 근처에서 저녁에 볼 공연을 추천해줘’"
)
DUPLICATE_ONLY_REPLY = "이미 저장된 장소예요. 같은 장소를 일정에 여러 번 넣고 싶다면 배치 화면에서 카드를 복제할 수 있어요."
CONSTRAINT_ALIASES = {
    "low_walking": "low_walking",
    "low walking": "low_walking",
    "minimal walking": "low_walking",
    "적게 걷기": "low_walking",
    "rainy_day_option": "rainy_day_option",
    "rainy day friendly": "rainy_day_option",
    "rainy_day_friendly": "rainy_day_option",
    "우천 대비": "rainy_day_option",
    "relaxed_pace": "relaxed_pace",
    "relaxed pace": "relaxed_pace",
    "느긋한 일정": "relaxed_pace",
    "with_children": "with_children",
    "with children": "with_children",
    "아이 동반": "with_children",
    "with_parents": "with_parents",
    "with parents": "with_parents",
    "부모님 동반": "with_parents",
    "wheelchair_accessible": "wheelchair_accessible",
    "wheelchair accessible": "wheelchair_accessible",
    "휠체어 접근": "wheelchair_accessible",
    "indoor_focused": "indoor_focused",
    "indoor focused": "indoor_focused",
    "indoor_friendly": "indoor_focused",
    "실내 중심": "indoor_focused",
    "public_transit": "public_transit",
    "public transit": "public_transit",
    "대중교통 중심": "public_transit",
    "budget_friendly": "budget_friendly",
    "budget friendly": "budget_friendly",
    "저예산": "budget_friendly",
    "late_hours": "late_hours",
    "late hours": "late_hours",
    "늦은 시간 가능": "late_hours",
}


def _normalize_string_list(value: Any, fallback: list[str]) -> list[str]:
    if not isinstance(value, list):
        return list(fallback)

    normalized: list[str] = []
    seen: set[str] = set()
    for item in value:
        if not isinstance(item, str):
            continue
        item = item.strip()
        if not item or len(item) > 100:
            continue
        key = item.lower()
        if key in seen:
            continue
        seen.add(key)
        normalized.append(item)
        if len(normalized) == 20:
            break
    return normalized


def _normalize_context(raw: Any, original: ChatContext) -> ChatContext:
    if not isinstance(raw, dict):
        return original.model_copy(deep=True)
    return ChatContext(
        interests=_normalize_string_list(raw.get("interests"), original.interests),
        constraints=_normalize_constraints(raw.get("constraints"), original.constraints),
    )


def _normalize_constraints(value: Any, fallback: list[str]) -> list[str]:
    source = value if isinstance(value, list) else fallback
    normalized: list[str] = []
    seen: set[str] = set()
    for item in source:
        if not isinstance(item, str):
            continue
        canonical = CONSTRAINT_ALIASES.get(item.strip().lower())
        if canonical and canonical not in seen:
            seen.add(canonical)
            normalized.append(canonical)
            if len(normalized) == 20:
                break
    return normalized


def _normalize_duplicates(raw: Any) -> list[DuplicateItem]:
    if not isinstance(raw, list):
        return []
    result: list[DuplicateItem] = []
    seen: set[str] = set()
    for index, item in enumerate(raw):
        if not isinstance(item, dict):
            logger.warning("Skipping invalid chat duplicate at index=%d", index)
            continue
        name = item.get("name")
        if not isinstance(name, str) or not name.strip() or len(name.strip()) > 200:
            logger.warning("Skipping invalid chat duplicate name at index=%d", index)
            continue
        if item.get("reason", "already_exists") != "already_exists":
            logger.warning("Skipping invalid chat duplicate reason at index=%d", index)
            continue
        normalized_name = name.strip()
        key = normalized_name.lower()
        if key in seen:
            continue
        seen.add(key)
        result.append(DuplicateItem(name=normalized_name))
    return result


def _explicit_existing_duplicates(req: ChatParseRequest) -> list[DuplicateItem]:
    normalized_message = re.sub(r"\s+", "", req.message).lower()
    duplicates: list[DuplicateItem] = []
    seen: set[str] = set()
    for card in req.existing_cards:
        name = card.name.strip()
        key = re.sub(r"\s+", "", name).lower()
        if key and key in normalized_message and key not in seen:
            seen.add(key)
            duplicates.append(DuplicateItem(name=name))
    return duplicates


def _merge_duplicate_items(*groups: list[DuplicateItem]) -> list[DuplicateItem]:
    merged: list[DuplicateItem] = []
    seen: set[str] = set()
    for group in groups:
        for item in group:
            key = item.name.strip().lower()
            if key and key not in seen:
                seen.add(key)
                merged.append(item)
    return merged


def _parse_candidate_cards(raw: Any, max_cards: int) -> list[ParsedCard]:
    if not isinstance(raw, list):
        return []

    cards: list[ParsedCard] = []
    for index, item in enumerate(raw):
        if not isinstance(item, dict):
            logger.warning("Skipping non-object chat card at index=%d", index)
            continue
        candidate = dict(item)
        candidate.update(
            classification="open_question",
            placement_status="ready_partial",
            is_ai_generated=True,
            allow_duplicate=False,
            question_text=None,
            options=None,
            source=None,
        )
        try:
            card = ParsedCard.model_validate(candidate)
        except Exception as exc:
            logger.warning("Skipping invalid chat card at index=%d | error=%s", index, exc)
            continue
        if card.category in {Category.ACCOMMODATION, Category.TRANSPORT}:
            logger.warning("Dropping forbidden chat card category=%s name=%s", card.category, card.name)
            continue
        cards.append(card)
        if len(cards) == max_cards:
            break
    return cards


def _has_valid_place(card: ParsedCard) -> bool:
    if not card.place_id or not card.place_id.strip() or card.coordinates is None:
        return False
    lat = card.coordinates.lat
    lng = card.coordinates.lng
    return (
        math.isfinite(lat)
        and math.isfinite(lng)
        and -90 <= lat <= 90
        and -180 <= lng <= 180
    )


async def parse_chat(req: ChatParseRequest) -> ChatParseResponse:
    raw = await asyncio.to_thread(_call_gemini, build_chat_parse_prompt(req))
    parsed = _extract_json(raw)

    raw_intent = parsed.get("intent")
    intent = raw_intent if raw_intent in VALID_INTENTS else "need_clarification"
    reply = parsed.get("reply")
    if not isinstance(reply, str) or not reply.strip():
        reply = FALLBACK_REPLIES[intent]
    else:
        reply = reply.strip()

    updated_context = _normalize_context(parsed.get("updated_context"), req.context)
    duplicates = _merge_duplicate_items(
        _normalize_duplicates(parsed.get("duplicates")),
        _explicit_existing_duplicates(req),
    )
    if intent != "generate_cards":
        if duplicates:
            reply = DUPLICATE_ONLY_REPLY
        return ChatParseResponse(
            intent=intent,
            reply=reply,
            updated_context=updated_context,
            cards=[],
            duplicates=duplicates,
        )

    cards = _parse_candidate_cards(parsed.get("cards"), req.max_cards)
    if cards:
        pseudo_req = ParseRequest(
            trip_id=req.trip_id,
            dump_text=req.message,
            destinations=req.destinations,
            travel_days=req.travel_days,
            companion_count=req.companion_count,
        )
        cards = await enrich_cards_blocking(pseudo_req, cards)

    kept = [
        card.model_copy(update={"placement_status": PlacementStatus.READY})
        for card in cards
        if _has_valid_place(card)
    ]
    if not kept:
        reply = DUPLICATE_ONLY_REPLY if duplicates else NO_MATCH_REPLY

    return ChatParseResponse(
        intent=intent,
        reply=reply,
        updated_context=updated_context,
        cards=[CardResponse.model_validate(card.model_dump()) for card in kept],
        duplicates=duplicates,
    )
