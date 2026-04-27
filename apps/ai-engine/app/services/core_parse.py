from __future__ import annotations

import json
import logging
import os
import re
import time
import uuid
import asyncio
from dataclasses import dataclass
from datetime import datetime
from difflib import SequenceMatcher
from typing import Optional

import httpx
from google.api_core.exceptions import ResourceExhausted
import google.genai as genai

from app.prompts.core_parse import build_core_parse_prompt
from app.schemas.parse import (
    AlertCardResponse,
    CardResponse,
    Category,
    Classification,
    Coordinates,
    FlightInput,
    ParseRequest,
    PlacementStatus,
)

logger = logging.getLogger(__name__)

GEMINI_COOLDOWN_SECONDS = int(os.getenv("GEMINI_COOLDOWN_SECONDS", "60"))
PLACES_API_URL = "https://places.googleapis.com/v1/places:searchText"
PLACES_FIELD_MASK = ",".join(
    [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.shortFormattedAddress",
    ]
)
PLACES_HINT_MESSAGE = "장소 정보를 확인해주세요."
PLACES_MAX_CONCURRENCY = int(os.getenv("PLACES_MAX_CONCURRENCY", "4"))
PLACES_ELIGIBLE_CATEGORIES = {
    Category.PLACE,
    Category.ACTIVITY,
    Category.ACCOMMODATION,
    Category.FOOD,
    Category.TRANSPORT,
}

gemini_blocked_until = 0.0


class GeminiCooldownError(RuntimeError):
    pass


@dataclass
class CoreParseResult:
    context_summary: str
    cards: list["ParsedCard"]
    alert_cards: list[AlertCardResponse]
    raw_response: str


class ParsedCard(CardResponse):
    search_alias: Optional[str] = None


def _gemini_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured.")
    return genai.Client(api_key=api_key)


def _places_api_key() -> str | None:
    return os.getenv("GOOGLE_PLACES_API_KEY") or os.getenv("GOOGLE_MAPS_API_KEY")


def _extract_json(raw: str) -> dict:
    cleaned = re.sub(r"```(?:json)?\s*", "", raw).strip().rstrip("```").strip()

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.error("JSON parse failed: %s | raw=%s", exc, raw[:500])
        raise ValueError(f"Gemini response was not valid JSON: {exc}") from exc

    if not isinstance(parsed, dict):
        raise ValueError("Gemini response root must be a JSON object.")

    return parsed


def _infer_name_from_text(value: str | None, category: str | None) -> str | None:
    if not value or not isinstance(value, str):
        return None

    text = value.strip()
    if not text:
        return None

    explicit_patterns = [
        r"어떤\s+(.+?)\s+(?:에\s+방문|을\s+방문|를\s+방문)",
        r"어떤\s+(.+?)\s+(?:을\s+먹|를\s+먹)",
        r"어떤\s+(.+?)\s+(?:을\s+원|를\s+원)",
        r"(.+?)\s+방문을\s+희망",
        r"(.+?)\s+식사를\s+희망",
    ]
    for pattern in explicit_patterns:
        match = re.search(pattern, text)
        if match:
            candidate = match.group(1).strip(" \"'")
            if candidate:
                return candidate

    keyword_fallbacks = [
        ("오코노미야끼", "오코노미야끼 맛집"),
        ("카페", "카페"),
        ("라멘", "라멘"),
        ("스시", "스시"),
        ("료칸", "료칸"),
        ("친구집", "친구집"),
        ("친구네 집", "친구네 집"),
        ("단골집", "단골집"),
    ]
    for keyword, replacement in keyword_fallbacks:
        if keyword in text:
            return replacement

    if category == Category.FOOD.value and "맛집" in text:
        return "맛집"

    return None


def _ensure_card_name(raw_card: dict) -> dict:
    name = raw_card.get("name")
    if isinstance(name, str) and name.strip():
        return raw_card

    inferred_name = (
        _infer_name_from_text(raw_card.get("question_text"), raw_card.get("category"))
        or _infer_name_from_text(raw_card.get("user_context"), raw_card.get("category"))
    )

    tags = raw_card.get("tags")
    if not inferred_name and isinstance(tags, list):
        for tag in tags:
            inferred_name = _infer_name_from_text(tag, raw_card.get("category"))
            if inferred_name:
                break

    if inferred_name:
        patched = dict(raw_card)
        patched["name"] = inferred_name
        logger.info("Patched missing card name | inferred_name=%s | raw=%s", inferred_name, raw_card)
        return patched

    return raw_card


def _parse_cards(raw_cards: list[dict]) -> list[ParsedCard]:
    cards: list[ParsedCard] = []
    for index, raw_card in enumerate(raw_cards):
        try:
            normalized_card = _ensure_card_name(raw_card)
            cards.append(ParsedCard.model_validate(normalized_card))
        except Exception as exc:
            logger.warning("Skipping invalid card at index=%d | error=%s | raw=%s", index, exc, raw_card)
    return cards


def _parse_alert_cards(raw_alerts: list[dict]) -> list[AlertCardResponse]:
    alerts: list[AlertCardResponse] = []
    for raw_alert in raw_alerts:
        try:
            if not raw_alert.get("id"):
                raw_alert["id"] = str(uuid.uuid4())
            alerts.append(AlertCardResponse.model_validate(raw_alert))
        except Exception as exc:
            logger.warning("Skipping invalid alert card | error=%s | raw=%s", exc, raw_alert)
    return alerts


def _normalize_for_match(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"[^0-9a-zA-Z가-힣ぁ-ゔァ-ヴー々〆〤一-龥]", "", value).lower()


def _is_name_match(card: ParsedCard, place_name: str) -> bool:
    candidate = _normalize_for_match(place_name)
    if not candidate:
        return False

    aliases = [card.name, card.search_alias]
    normalized_aliases = [_normalize_for_match(alias) for alias in aliases if alias]

    for normalized_alias in normalized_aliases:
        if not normalized_alias:
            continue
        if normalized_alias in candidate or candidate in normalized_alias:
            return True
        if len(normalized_alias) >= 3 and SequenceMatcher(None, normalized_alias, candidate).ratio() >= 0.6:
            return True

    return False


def _append_user_context(card: ParsedCard, message: str) -> str:
    if not card.user_context:
        return message
    if message in card.user_context:
        return card.user_context
    return f"{card.user_context} {message}".strip()


def _sanitize_needs_input_cards(cards: list[ParsedCard]) -> list[ParsedCard]:
    sanitized: list[ParsedCard] = []
    for card in cards:
        if card.placement_status == PlacementStatus.NEEDS_INPUT:
            sanitized.append(
                card.model_copy(
                    update={
                        "location": None,
                        "coordinates": None,
                        "place_id": None,
                        "address": None,
                    }
                )
            )
            continue
        sanitized.append(card)
    return sanitized


def _format_flight_time_constraint(value: str) -> str | None:
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return f"{parsed.strftime('%H:%M')} 출발"


def _matches_flight_card(card: ParsedCard, flight: FlightInput) -> bool:
    if card.flight_number and flight.flight_number:
        return card.flight_number.strip().lower() == flight.flight_number.strip().lower()

    if not card.name:
        return False

    name = card.name.lower()
    departure = (flight.departure_airport or "").lower()
    arrival = (flight.arrival_airport or "").lower()
    return bool(departure and arrival and departure in name and arrival in name)


def _apply_flight_constraints(cards: list[ParsedCard], req: ParseRequest) -> list[ParsedCard]:
    flights = [flight for flight in [req.departure_flight, req.return_flight] if flight and flight.datetime]
    if not flights:
        return cards

    updated_cards: list[ParsedCard] = []
    for card in cards:
        updated = card
        if card.category == Category.TRANSPORT and not card.time_constraint:
            for flight in flights:
                if _matches_flight_card(card, flight):
                    formatted = _format_flight_time_constraint(flight.datetime or "")
                    if formatted:
                        updated = card.model_copy(update={"time_constraint": formatted})
                    break
        updated_cards.append(updated)
    return updated_cards


def _query_candidates(card: ParsedCard, req: ParseRequest) -> list[str]:
    destinations = [destination.strip() for destination in req.destinations if destination.strip()]
    primary_destination = destinations[0] if destinations else ""
    location = (card.location or "").strip()
    alias = (card.search_alias or "").strip()
    name = card.name.strip()

    candidates = [
        f"{name} {location}".strip(),
        f"{name} {primary_destination}".strip(),
        f"{alias} {location}".strip() if alias else "",
        f"{alias} {primary_destination}".strip() if alias else "",
    ]

    deduped: list[str] = []
    seen: set[str] = set()
    for candidate in candidates:
        if not candidate:
            continue
        if candidate in seen:
            continue
        deduped.append(candidate)
        seen.add(candidate)
    return deduped


def _uses_search_alias(card: ParsedCard, query: str) -> bool:
    alias = (card.search_alias or "").strip()
    return bool(alias and alias in query)


def _can_accept_single_result_without_name_match(card: ParsedCard, query: str, places: list[dict]) -> bool:
    if len(places) != 1:
        return False
    if _uses_search_alias(card, query):
        return True
    if card.source == "structured_input" and card.category in {Category.ACCOMMODATION, Category.TRANSPORT}:
        return True
    return False


async def _search_place(query: str, api_key: str) -> dict | None:
    payload = {
        "textQuery": query,
        "pageSize": 5,
    }
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": PLACES_FIELD_MASK,
    }

    async with httpx.AsyncClient(timeout=8.0) as client:
        response = await client.post(PLACES_API_URL, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()


def _apply_place_match(card: ParsedCard, place: dict) -> ParsedCard:
    location = place.get("location") or {}
    coordinates = None
    if location.get("latitude") is not None and location.get("longitude") is not None:
        coordinates = Coordinates(lat=float(location["latitude"]), lng=float(location["longitude"]))

    resolved_location = card.location or place.get("shortFormattedAddress") or place.get("formattedAddress")

    return card.model_copy(
        update={
            "place_id": place.get("id"),
            "coordinates": coordinates,
            "address": place.get("formattedAddress"),
            "location": resolved_location,
        }
    )


async def _enrich_card(card: ParsedCard, req: ParseRequest, api_key: str) -> ParsedCard:
    if card.classification == Classification.UNASSIGNED:
        return card
    if card.classification == Classification.UNDECIDED:
        return card
    if card.placement_status == PlacementStatus.NEEDS_INPUT:
        return card
    if card.category not in PLACES_ELIGIBLE_CATEGORIES:
        return card
    if not card.name.strip():
        return card

    for query in _query_candidates(card, req):
        try:
            payload = await _search_place(query, api_key)
        except httpx.HTTPError as exc:
            logger.warning("Places lookup failed for query=%s | error=%s", query, exc)
            return card

        places = payload.get("places") if isinstance(payload, dict) else None
        logger.info(
            "Places query complete | card=%s | query=%s | results=%d",
            card.name,
            query,
            len(places or []),
        )
        if not places:
            continue

        for index, place in enumerate(places):
            display_name = ((place.get("displayName") or {}).get("text") or "").strip()
            formatted_address = (place.get("formattedAddress") or "").strip()
            name_matched = _is_name_match(card, display_name)
            logger.info(
                "Places candidate | card=%s | query=%s | idx=%d | name=%s | address=%s | name_matched=%s | destinations=%s",
                card.name,
                query,
                index,
                display_name,
                formatted_address,
                name_matched,
                req.destinations,
            )
            if name_matched:
                return _apply_place_match(card, place)

        if _can_accept_single_result_without_name_match(card, query, places):
            logger.info(
                "Places relaxed match accepted | card=%s | query=%s | reason=%s",
                card.name,
                query,
                "alias_or_structured_input_single_result",
            )
            return _apply_place_match(card, places[0])

    if card.source != "structured_input":
        return card.model_copy(
            update={
                "user_context": _append_user_context(card, PLACES_HINT_MESSAGE),
            }
        )

    return card


async def _enrich_card_with_semaphore(
    semaphore: asyncio.Semaphore,
    card: ParsedCard,
    req: ParseRequest,
    api_key: str,
) -> ParsedCard:
    async with semaphore:
        return await _enrich_card(card, req, api_key)


async def enrich_cards_blocking(req: ParseRequest, cards: list[ParsedCard]) -> list[ParsedCard]:
    api_key = _places_api_key()
    if not api_key:
        logger.info("Skipping Places enrichment because API key is not configured.")
        return cards

    semaphore = asyncio.Semaphore(max(1, PLACES_MAX_CONCURRENCY))
    results = await asyncio.gather(
        *[_enrich_card_with_semaphore(semaphore, card, req, api_key) for card in cards],
        return_exceptions=True,
    )

    enriched_cards: list[ParsedCard] = []
    for card, result in zip(cards, results):
        if isinstance(result, Exception):
            logger.warning("Blocking enrichment failed for card=%s | error=%s", card.name, result)
            enriched_cards.append(card)
            continue
        enriched_cards.append(result)
    return enriched_cards


def _call_gemini(prompt: str, model_name: str = "gemini-2.5-flash") -> str:
    global gemini_blocked_until

    if time.monotonic() < gemini_blocked_until:
        retry_after = int(gemini_blocked_until - time.monotonic()) + 1
        raise GeminiCooldownError(
            f"Gemini temporarily blocked due to recent quota errors. Retry after {retry_after} seconds."
        )

    client = _gemini_client()

    try:
        response = client.models.generate_content(model=model_name, contents=prompt)
    except ResourceExhausted as exc:
        gemini_blocked_until = time.monotonic() + GEMINI_COOLDOWN_SECONDS
        raise GeminiCooldownError(
            f"Gemini quota reached. Retry after {GEMINI_COOLDOWN_SECONDS} seconds."
        ) from exc

    text = response.text
    if not text:
        raise ValueError("Gemini returned an empty response.")
    return text


async def parse_core(req: ParseRequest) -> CoreParseResult:
    prompt = build_core_parse_prompt(req)
    raw_text = await asyncio.to_thread(_call_gemini, prompt)

    parsed = _extract_json(raw_text)

    raw_cards = parsed.get("cards", [])
    if not isinstance(raw_cards, list) or not raw_cards:
        raise ValueError("Gemini response must include a non-empty cards array.")

    raw_alerts = parsed.get("alert_cards", [])
    if raw_alerts is None:
        raw_alerts = []
    if not isinstance(raw_alerts, list):
        raise ValueError("alert_cards must be an array when provided.")

    cards = _parse_cards(raw_cards)
    if not cards:
        raise ValueError("All parsed cards were invalid after schema validation.")

    context_summary = parsed.get("context_summary")
    if not isinstance(context_summary, str) or not context_summary.strip():
        raise ValueError("context_summary must be a non-empty string.")

    return CoreParseResult(
        context_summary=context_summary.strip(),
        cards=cards,
        alert_cards=_parse_alert_cards(raw_alerts),
        raw_response=raw_text,
    )


async def parse_with_blocking_enrichment(req: ParseRequest) -> CoreParseResult:
    result = await parse_core(req)
    sanitized_cards = _sanitize_needs_input_cards(result.cards)
    constrained_cards = _apply_flight_constraints(sanitized_cards, req)
    enriched_cards = await enrich_cards_blocking(req, constrained_cards)
    return CoreParseResult(
        context_summary=result.context_summary,
        cards=enriched_cards,
        alert_cards=result.alert_cards,
        raw_response=result.raw_response,
    )


def to_public_card(card: ParsedCard) -> CardResponse:
    payload = card.model_dump(exclude={"search_alias"})
    return CardResponse.model_validate(payload)
