from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv
from pydantic import ValidationError

import json
from json import JSONDecodeError
import time
from typing import Any

from google.api_core.exceptions import ResourceExhausted
import google.genai as genai
import os

from app.schemas.parse import ParseRequest, ParseResponse

load_dotenv()  # .env 파일에서 환경 변수 로드

GEMINI_COOLDOWN_SECONDS = int(os.getenv("GEMINI_COOLDOWN_SECONDS", "60"))
gemini_blocked_until = 0.0

CATEGORY_ALIASES = {
    "식사": "dining",
    "맛집": "dining",
    "dining": "dining",
    "restaurant": "dining",
    "food": "dining",
    "관광": "attraction",
    "명소": "attraction",
    "attraction": "attraction",
    "sightseeing": "attraction",
    "landmark": "attraction",
    "쇼핑": "shopping",
    "마트": "shopping",
    "shopping": "shopping",
    "market": "shopping",
    "숙박": "accommodation",
    "호텔": "accommodation",
    "accommodation": "accommodation",
    "hotel": "accommodation",
    "교통": "transportation",
    "공항": "transportation",
    "transportation": "transportation",
    "airport": "transportation",
}

DEFAULT_DURATIONS = {
    "dining": 60,
    "attraction": 90,
    "shopping": 120,
    "accommodation": 0,
    "transportation": 60,
    "uncategorized": 60,
}

VALID_CLASSIFICATIONS = {
    "confirmed",
    "open_question",
    "undecided",
    "unassigned",
}

VALID_STATUSES = {"loading", "success", "error"}

ALERT_TYPE_ALIASES = {
    "schedule_constraint": "timing_constraint",
    "time_constraint": "timing_constraint",
    "timing_constraint": "timing_constraint",
}


app = FastAPI(title="TripKey AI Engine")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# --- [build prompt] --- #
def build_prompt(req: ParseRequest) -> str:
    return f"""
    Parse the user's dump text into travel place candidate cards.

    Input:
    - trip_id: {req.trip_id}
    - dump_text: {req.dump_text}

    Follow all rules below.
    - Return exactly one JSON object.
    - Do not return markdown, code fences, explanations, or comments.
    - The cards array must not be empty.
    - If the input only contains a city or destination, return at least 3 likely place cards.
    - Only return places that are likely to exist in the real world.
    - Do not generate instance_id.
    - Each card must follow the schema exactly.
    - category must be one of: attraction, shopping, dining, accommodation, transportation, uncategorized.
    - classification must be one of: confirmed, open_question, undecided, unassigned.
    - status must be one of: loading, success, error.
    - estimated_duration_min must be an integer.
    - If status is success, estimated_duration_min is required.
    - If status is error, classification must be unassigned.
    - coordinates must be null or an object with numeric lat and lng.
    - context_summary is optional.
    - alert_cards is optional.
    - If you include alert_cards for time-related constraints, use type timing_constraint.

    Response schema:
    {{
      "cards": [
        {{
          "place_id": "string",
          "name": "string",
          "category": "attraction" | "shopping" | "dining" | "accommodation" | "transportation" | "uncategorized",
          "classification": "confirmed" | "open_question" | "undecided" | "unassigned",
          "status": "loading" | "success" | "error",
          "estimated_duration_min": number | null,
          "coordinates": {{
            "lat": number,
            "lng": number
          }} | null,
          "time_constraint": "string" | null,
          "is_ai_generated": true | false | null,
          "conflict_type": "string" | null,
          "conflict_reason": "string" | null,
          "remind": ["string"] | null
        }}
      ],
      "context_summary": "string",
      "alert_cards": [
        {{
          "type": "string",
          "message": "string",
          "related_instance_ids": ["string"]
        }}
      ]
    }}
    """


def call_gemini(prompt: str) -> str:
    if time.monotonic() < gemini_blocked_until:
        retry_after = int(gemini_blocked_until - time.monotonic()) + 1
        raise RuntimeError(
            f"Gemini temporarily blocked. Retry after {retry_after} seconds."
        )

    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
    text = response.text

    if not text:
        raise ValueError("Gemini returned an empty response")

    return text


def clean_gemini_response(raw: str) -> str:
    cleaned = raw.strip()

    if cleaned.startswith("```json"):
        cleaned = cleaned.removeprefix("```json").strip()
    elif cleaned.startswith("```"):
        cleaned = cleaned.removeprefix("```").strip()

    if cleaned.endswith("```"):
        cleaned = cleaned.removesuffix("```").strip()

    return cleaned


def normalize_category(value: Any) -> str:
    if isinstance(value, str):
        return CATEGORY_ALIASES.get(value.strip().lower(), "uncategorized")

    return "uncategorized"


def normalize_classification(value: Any, status: str) -> str:
    if status == "error":
        return "unassigned"

    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in VALID_CLASSIFICATIONS:
            return normalized

    return "unassigned"


def normalize_status(value: Any) -> str:
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in VALID_STATUSES:
            return normalized

    return "success"


def coerce_int(value: Any) -> int | None:
    if isinstance(value, bool):
        return None

    if isinstance(value, int):
        return value

    if isinstance(value, float):
        return int(value)

    if isinstance(value, str):
        stripped = value.strip()
        if stripped.isdigit():
            return int(stripped)

    return None


def normalize_duration(category: str, status: str, value: Any) -> int | None:
    if category == "accommodation":
        return 0

    duration = coerce_int(value)

    if duration is None:
        if status == "success":
            return DEFAULT_DURATIONS[category]
        return None

    if duration < 0:
        return DEFAULT_DURATIONS[category] if status == "success" else None

    if duration > 1440:
        return 1440

    return duration


def normalize_coordinates(value: Any) -> dict[str, float] | None:
    if not isinstance(value, dict):
        return None

    lat = value.get("lat")
    lng = value.get("lng")

    try:
        if lat is None or lng is None:
            return None
        return {"lat": float(lat), "lng": float(lng)}
    except (TypeError, ValueError):
        return None


def normalize_string_list(value: Any) -> list[str] | None:
    if not isinstance(value, list):
        return None

    normalized = [item.strip() for item in value if isinstance(item, str) and item.strip()]
    return normalized or None


def normalize_place_card(card: Any) -> dict[str, Any]:
    if not isinstance(card, dict):
        raise ValueError("each card must be an object")

    category = normalize_category(card.get("category"))
    status = normalize_status(card.get("status"))
    classification = normalize_classification(card.get("classification"), status)

    normalized_card: dict[str, Any] = {
        "place_id": str(card.get("place_id") or "").strip(),
        "name": str(card.get("name") or "").strip(),
        "category": category,
        "classification": classification,
        "status": status,
        "estimated_duration_min": normalize_duration(
            category, status, card.get("estimated_duration_min")
        ),
        "coordinates": normalize_coordinates(card.get("coordinates")),
        "time_constraint": card.get("time_constraint")
        if isinstance(card.get("time_constraint"), str)
        else None,
        "is_ai_generated": card.get("is_ai_generated")
        if isinstance(card.get("is_ai_generated"), bool)
        else None,
        "conflict_type": card.get("conflict_type")
        if isinstance(card.get("conflict_type"), str)
        else None,
        "conflict_reason": card.get("conflict_reason")
        if isinstance(card.get("conflict_reason"), str)
        else None,
        "remind": normalize_string_list(card.get("remind")),
    }

    if not normalized_card["place_id"] or not normalized_card["name"]:
        raise ValueError("place_id and name are required")

    return normalized_card


def normalize_alert_card(alert: Any) -> dict[str, Any]:
    if not isinstance(alert, dict):
        raise ValueError("each alert card must be an object")

    raw_type = alert.get("type")
    normalized_type = "timing_constraint"
    if isinstance(raw_type, str):
        normalized_type = ALERT_TYPE_ALIASES.get(
            raw_type.strip().lower(), raw_type.strip().lower()
        )

    related_instance_ids = normalize_string_list(alert.get("related_instance_ids"))
    message = alert.get("message")

    if not isinstance(message, str) or not message.strip():
        raise ValueError("alert card message is required")

    return {
        "type": normalized_type,
        "message": message.strip(),
        "related_instance_ids": related_instance_ids,
    }


def normalize_gemini_payload(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise ValueError("response root must be a JSON object")

    raw_cards = payload.get("cards")
    if not isinstance(raw_cards, list):
        raise ValueError("cards must be an array")

    raw_alert_cards = payload.get("alert_cards")
    if raw_alert_cards is None:
        normalized_alert_cards = None
    elif isinstance(raw_alert_cards, list):
        normalized_alert_cards = [normalize_alert_card(alert) for alert in raw_alert_cards]
    else:
        raise ValueError("alert_cards must be an array when provided")

    context_summary = payload.get("context_summary")
    if not isinstance(context_summary, str):
        context_summary = None

    return {
        "cards": [normalize_place_card(card) for card in raw_cards],
        "context_summary": context_summary,
        "alert_cards": normalized_alert_cards,
    }


def parse_gemini_response(raw: str) -> ParseResponse:
    cleaned = clean_gemini_response(raw)
    normalized_payload = normalize_gemini_payload(json.loads(cleaned))
    parsed = ParseResponse.model_validate(normalized_payload)

    if not parsed.cards:
        raise ValueError("cards must not be empty")

    return parsed


@app.post("/internal/ai/parse")
def parse_user_input(
    req: ParseRequest,
) -> ParseResponse:
    global gemini_blocked_until
    prompt = build_prompt(req)

    try:
        raw = call_gemini(prompt)
    except ResourceExhausted as e:
        gemini_blocked_until = time.monotonic() + GEMINI_COOLDOWN_SECONDS
        raise HTTPException(
            status_code=503,
            detail={
                "message": "Gemini quota/rate limit reached. Temporary cooldown enabled.",
                "retry_after_sec": GEMINI_COOLDOWN_SECONDS,
                "error": str(e),
            },
        ) from e
    except RuntimeError as e:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "GEMINI_COOLDOWN_ACTIVE",
                "message": "Gemini is temporarily blocked due to recent quota errors",
                "error": str(e),
            },
        ) from e
    except ValueError as e:
        raise HTTPException(
            status_code=502,
            detail={
                "code": "EMPTY_RESPONSE",
                "message": "Gemini returned an empty response",
                "prompt": prompt,
                "error": str(e),
            },
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail={
                "code": "MODEL_CALL_FAILED",
                "message": "Failed to call Gemini",
                "prompt": prompt,
                "error": str(e),
            },
        ) from e

    try:
        return parse_gemini_response(raw)
    except JSONDecodeError as e:
        raise HTTPException(
            status_code=502,
            detail={
                "code": "INVALID_JSON",
                "message": "Gemini response was not valid JSON",
                "raw": raw,
                "error": str(e),
            },
        ) from e
    except ValidationError as e:
        raise HTTPException(
            status_code=502,
            detail={
                "code": "INVALID_SCHEMA",
                "message": "Gemini response did not match the expected schema",
                "raw": raw,
                "error": str(e),
            },
        ) from e
    except ValueError as e:
        raise HTTPException(
            status_code=502,
            detail={
                "code": "INVALID_RESPONSE",
                "message": "Gemini response failed post-parse validation",
                "raw": raw,
                "error": str(e),
            },
        ) from e
