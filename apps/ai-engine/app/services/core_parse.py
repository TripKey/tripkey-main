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
from app.prompts.card_parse import build_card_parse_prompt
from app.schemas.card_parse import CardParseRequest
from app.schemas.parse import (
    AlertCardResponse,
    CardResponse,
    Category,
    Classification,
    Coordinates,
    FlightInput,
    FlightRole,
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
DESTINATION_ADDRESS_HINTS = {
    "도쿄": {"도쿄", "tokyo", "japan", "日本", "東京都"},
    "동경": {"동경", "tokyo", "japan", "日本", "東京都"},
    "오사카": {"오사카", "osaka", "japan", "日本", "大阪"},
    "교토": {"교토", "kyoto", "japan", "日本", "京都"},
    "삿포로": {"삿포로", "sapporo", "japan", "日本", "札幌"},
    "후쿠오카": {"후쿠오카", "fukuoka", "japan", "日本", "福岡"},
    "나고야": {"나고야", "nagoya", "japan", "日本", "名古屋"},
    "방콕": {"방콕", "bangkok", "thailand", "ประเทศไทย", "กรุงเทพ"},
    "파리": {"파리", "paris", "france", "français", "ile-de-france", "île-de-france"},
    "런던": {"런던", "london", "united kingdom", "england", "uk"},
    "뉴욕": {"뉴욕", "new york", "united states", "usa", "ny"},
    "하노이": {"하노이", "hanoi", "vietnam", "việt nam"},
    "다낭": {"다낭", "da nang", "danang", "vietnam", "việt nam"},
    "싱가포르": {"싱가포르", "singapore"},
    "타이베이": {"타이베이", "taipei", "taiwan", "台北", "臺北", "台灣", "臺灣"},
    "제주": {"제주", "jeju", "south korea", "korea", "대한민국"},
}
DESTINATION_REGION_CODES = {
    "도쿄": "jp",
    "동경": "jp",
    "오사카": "jp",
    "교토": "jp",
    "삿포로": "jp",
    "후쿠오카": "jp",
    "나고야": "jp",
    "방콕": "th",
    "파리": "fr",
    "런던": "gb",
    "뉴욕": "us",
    "하노이": "vn",
    "다낭": "vn",
    "싱가포르": "sg",
    "타이베이": "tw",
    "제주": "kr",
}
DESTINATION_COUNTRY_QUERY_HINTS = {
    "jp": "japan",
    "th": "thailand",
    "fr": "france",
    "gb": "uk",
    "us": "usa",
    "vn": "vietnam",
    "sg": "singapore",
    "tw": "taiwan",
    "kr": "korea",
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
            normalized_card = _normalize_generic_open_question(normalized_card)
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


GENERIC_RECOMMENDATION_TERMS = {
    "attractions",
    "activities",
    "cafes",
    "coffee",
    "dining",
    "food",
    "foods",
    "landmarks",
    "markets",
    "museums",
    "nightlife",
    "restaurants",
    "shopping",
    "sightseeing",
    "things to do",
    "tours",
    "관광",
    "관광지",
    "랜드마크",
    "맛집",
    "먹거리",
    "미식",
    "박물관",
    "쇼핑",
    "시장",
    "야경",
    "액티비티",
    "음식",
    "음식점",
    "주요 관광지",
    "체험",
    "카페",
    "현지 맛집",
}


def _contains_generic_recommendation_term(value: str | None) -> bool:
    if not value:
        return False
    normalized = re.sub(r"\s+", " ", value.strip().lower())
    squashed = _normalize_for_match(value)
    return any(
        term in normalized or _normalize_for_match(term) in squashed
        for term in GENERIC_RECOMMENDATION_TERMS
    )


def _is_generic_recommendation_card(card: ParsedCard) -> bool:
    return (
        card.is_ai_generated
        and card.classification == Classification.OPEN_QUESTION
        and not card.place_id
        and not card.coordinates
        and _contains_generic_recommendation_term(card.name)
    )


def _normalize_generic_open_question(raw_card: dict) -> dict:
    if raw_card.get("classification") != Classification.OPEN_QUESTION.value:
        return raw_card
    if raw_card.get("is_ai_generated") is not True:
        return raw_card
    if raw_card.get("place_id") or raw_card.get("coordinates"):
        return raw_card
    if not _contains_generic_recommendation_term(raw_card.get("name")):
        return raw_card

    patched = dict(raw_card)
    patched["classification"] = Classification.UNDECIDED.value
    if patched.get("options"):
        patched["placement_status"] = PlacementStatus.READY_PARTIAL.value
    else:
        patched["placement_status"] = PlacementStatus.NEEDS_INPUT.value
        patched["options"] = None
    patched["question_text"] = patched.get("question_text") or f"{patched.get('name', '장소')} 중 어떤 곳을 원하시나요?"
    patched["place_id"] = None
    patched["coordinates"] = None
    patched["address"] = None
    logger.info("Normalized generic open_question card to undecided | name=%s", patched.get("name"))
    return patched


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


def _normalize_flight_datetime(value: str | None) -> str | None:
    if not value:
        return None
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return value


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
    flights = [
        (req.departure_flight, FlightRole.OUTBOUND),
        (req.return_flight, FlightRole.INBOUND),
    ]
    flights = [(flight, role) for flight, role in flights if flight and flight.datetime]

    updated_cards: list[ParsedCard] = []
    for card in cards:
        updated = card
        if card.category == Category.TRANSPORT:
            if card.flight_datetime:
                updated = card.model_copy(
                    update={"flight_datetime": _normalize_flight_datetime(card.flight_datetime)}
                )
            matched = False
            for flight, role in flights:
                if _matches_flight_card(updated, flight):
                    matched = True
                    updates = {
                        "flight_datetime": _normalize_flight_datetime(flight.datetime),
                        "flight_role": role,
                    }
                    formatted = _format_flight_time_constraint(flight.datetime or "")
                    if formatted and not updated.time_constraint:
                        updates["time_constraint"] = formatted
                    updated = updated.model_copy(update=updates)
                    break
            if not matched and updated.flight_role:
                updated = updated.model_copy(update={"flight_role": None})
        updated_cards.append(updated)
    return updated_cards


def _query_candidates(card: ParsedCard, req: ParseRequest) -> list[str]:
    destinations = [destination.strip() for destination in req.destinations if destination.strip()]
    primary_destination = destinations[0] if destinations else ""
    primary_region_code = _destination_region_codes([primary_destination])
    country_hint = (
        DESTINATION_COUNTRY_QUERY_HINTS.get(primary_region_code[0], "")
        if primary_region_code
        else ""
    )
    location = (card.location or "").strip()
    alias = (card.search_alias or "").strip()
    name = card.name.strip()

    candidates = [
        f"{name} {location}".strip() if location else "",
        f"{name} {primary_destination}".strip(),
        f"{name} {primary_destination} {country_hint}".strip() if country_hint else "",
        f"{alias} {location}".strip() if alias else "",
        f"{alias} {primary_destination}".strip() if alias else "",
        f"{alias} {primary_destination} {country_hint}".strip() if alias and country_hint else "",
        name,
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


def _destination_hints(destinations: list[str]) -> set[str]:
    hints: set[str] = set()
    for destination in destinations:
        normalized = destination.strip().lower()
        if not normalized:
            continue
        hints.add(normalized)
        hints.update(hint.lower() for hint in DESTINATION_ADDRESS_HINTS.get(destination.strip(), set()))
    return hints


def _destination_region_codes(destinations: list[str]) -> list[str]:
    codes: list[str] = []
    seen: set[str] = set()
    for destination in destinations:
        code = DESTINATION_REGION_CODES.get(destination.strip())
        if not code or code in seen:
            continue
        codes.append(code)
        seen.add(code)
    return codes


def _place_matches_destination_context(place: dict, req: ParseRequest) -> bool:
    hints = _destination_hints(req.destinations)
    if not hints:
        return True

    address_parts = [
        place.get("formattedAddress"),
        place.get("shortFormattedAddress"),
    ]
    address_text = " ".join(part for part in address_parts if isinstance(part, str)).lower()
    if not address_text:
        return True

    return any(hint in address_text for hint in hints)


def _uses_search_alias(card: ParsedCard, query: str) -> bool:
    alias = (card.search_alias or "").strip()
    return bool(alias and alias in query)


def _query_uses_destination_context(query: str, req: ParseRequest) -> bool:
    normalized_query = query.lower()
    destinations = [destination.strip().lower() for destination in req.destinations if destination.strip()]
    country_hints = {
        DESTINATION_COUNTRY_QUERY_HINTS[code]
        for code in _destination_region_codes(req.destinations)
        if code in DESTINATION_COUNTRY_QUERY_HINTS
    }
    return any(destination in normalized_query for destination in destinations) or any(
        hint in normalized_query for hint in country_hints
    )


def _can_accept_single_result_without_name_match(
    card: ParsedCard,
    query: str,
    places: list[dict],
    req: ParseRequest,
) -> bool:
    if len(places) != 1:
        return False
    if _uses_search_alias(card, query):
        return True
    if card.source == "structured_input" and card.category in {Category.ACCOMMODATION, Category.TRANSPORT}:
        return True
    if card.classification in {Classification.CONFIRMED, Classification.OPEN_QUESTION} and _query_uses_destination_context(
        query, req
    ):
        return True
    return False


async def _search_place(query: str, api_key: str, region_code: str | None = None) -> dict | None:
    payload = {
        "textQuery": query,
        "pageSize": 5,
    }
    if region_code:
        payload["regionCode"] = region_code
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
    if _is_generic_recommendation_card(card):
        return card
    if card.placement_status == PlacementStatus.NEEDS_INPUT:
        return card
    if card.category not in PLACES_ELIGIBLE_CATEGORIES:
        return card
    if not card.name.strip():
        return card

    destination_region_codes = _destination_region_codes(req.destinations)
    region_code = destination_region_codes[0] if len(destination_region_codes) == 1 else None
    for query in _query_candidates(card, req):
        try:
            payload = await _search_place(query, api_key, region_code)
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
            destination_matched = _place_matches_destination_context(place, req)
            logger.info(
                "Places candidate | card=%s | query=%s | idx=%d | name=%s | address=%s | name_matched=%s | destination_matched=%s | destinations=%s",
                card.name,
                query,
                index,
                display_name,
                formatted_address,
                name_matched,
                destination_matched,
                req.destinations,
            )
            if name_matched and destination_matched:
                return _apply_place_match(card, place)

        if _can_accept_single_result_without_name_match(card, query, places, req) and _place_matches_destination_context(
            places[0], req
        ):
            logger.info(
                "Places relaxed match accepted | card=%s | query=%s | reason=%s",
                card.name,
                query,
                "alias_structured_or_destination_single_result",
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


async def parse_card_level(req: CardParseRequest) -> ParsedCard:
    prompt = build_card_parse_prompt(req)
    raw_text = await asyncio.to_thread(_call_gemini, prompt)
    parsed = _extract_json(raw_text)

    if "card" in parsed and isinstance(parsed["card"], dict):
        raw_card = parsed["card"]
    elif "cards" in parsed and isinstance(parsed["cards"], list) and parsed["cards"]:
        raw_card = parsed["cards"][0]
    else:
        raw_card = parsed

    if not isinstance(raw_card, dict):
        raise ValueError("Gemini card parse response must be a JSON object.")

    raw_card = dict(raw_card)
    raw_card.pop("instance_id", None)
    raw_card["place_id"] = None
    raw_card["coordinates"] = None
    raw_card["address"] = None
    raw_card.setdefault("is_ai_generated", False)
    raw_card.setdefault("allow_duplicate", req.card.category in {Category.ACCOMMODATION, Category.TRANSPORT})

    card = ParsedCard.model_validate(_ensure_card_name(raw_card))
    api_key = _places_api_key()
    if not api_key:
        logger.info("Skipping card-level Places enrichment because API key is not configured.")
        return card

    enrichment_req = ParseRequest(
        trip_id=req.trip_id,
        dump_text=req.natural_language_input,
        destinations=req.destinations if req.destinations else [""],
        travel_days=req.travel_days or 1,
        companion_count=req.companion_count or 1,
    )
    return await _enrich_card(card, enrichment_req, api_key)


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
    payload = card.model_dump()
    return CardResponse.model_validate(payload)
