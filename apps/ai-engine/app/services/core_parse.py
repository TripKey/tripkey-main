from __future__ import annotations

import json
import logging
import os
import re
import time
import uuid
from dataclasses import dataclass
from difflib import SequenceMatcher

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
    ParseRequest,
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
    cards: list[CardResponse]
    alert_cards: list[AlertCardResponse]
    raw_response: str


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


def _parse_cards(raw_cards: list[dict]) -> list[CardResponse]:
    cards: list[CardResponse] = []
    for index, raw_card in enumerate(raw_cards):
        try:
            cards.append(CardResponse.model_validate(raw_card))
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


def _is_name_match(card: CardResponse, place_name: str) -> bool:
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


def _append_user_context(card: CardResponse, message: str) -> str:
    if not card.user_context:
        return message
    if message in card.user_context:
        return card.user_context
    return f"{card.user_context} {message}".strip()


def _query_candidates(card: CardResponse, req: ParseRequest) -> list[str]:
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


def _apply_place_match(card: CardResponse, place: dict) -> CardResponse:
    location = place.get("location") or {}
    coordinates = None
    if location.get("latitude") is not None and location.get("longitude") is not None:
        coordinates = Coordinates(lat=float(location["latitude"]), lng=float(location["longitude"]))

    display_name = place.get("displayName") or {}
    resolved_location = card.location or place.get("shortFormattedAddress") or place.get("formattedAddress")

    return card.model_copy(
        update={
            "place_id": place.get("id"),
            "coordinates": coordinates,
            "address": place.get("formattedAddress"),
            "location": resolved_location,
            "name": display_name.get("text") or card.name,
        }
    )


async def _enrich_card(card: CardResponse, req: ParseRequest, api_key: str) -> CardResponse:
    if card.classification == Classification.UNASSIGNED:
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
        if not places:
            continue

        top_place = places[0]
        display_name = ((top_place.get("displayName") or {}).get("text") or "").strip()
        if _is_name_match(card, display_name):
            return _apply_place_match(card, top_place)

    return card.model_copy(
        update={
            "user_context": _append_user_context(card, PLACES_HINT_MESSAGE),
        }
    )


async def enrich_cards_blocking(req: ParseRequest, cards: list[CardResponse]) -> list[CardResponse]:
    api_key = _places_api_key()
    if not api_key:
        logger.info("Skipping Places enrichment because API key is not configured.")
        return cards

    enriched_cards: list[CardResponse] = []
    for card in cards:
        try:
            enriched_cards.append(await _enrich_card(card, req, api_key))
        except Exception as exc:
            logger.warning("Blocking enrichment failed for card=%s | error=%s", card.name, exc)
            enriched_cards.append(card)
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
    raw_text = _call_gemini(prompt)

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
    enriched_cards = await enrich_cards_blocking(req, result.cards)
    return CoreParseResult(
        context_summary=result.context_summary,
        cards=enriched_cards,
        alert_cards=result.alert_cards,
        raw_response=result.raw_response,
    )
