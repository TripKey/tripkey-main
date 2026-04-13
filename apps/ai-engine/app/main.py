from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv
from pydantic import ValidationError

import json
from json import JSONDecodeError
import time

from google.api_core.exceptions import ResourceExhausted
import google.genai as genai
import os

from app.schemas.parse import ParseRequest, ParseResponse

load_dotenv()  # .env 파일에서 환경 변수 로드

GEMINI_COOLDOWN_SECONDS = int(os.getenv("GEMINI_COOLDOWN_SECONDS", "60"))
gemini_blocked_until = 0.0


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


def parse_gemini_response(raw: str) -> ParseResponse:
    cleaned = clean_gemini_response(raw)
    parsed = ParseResponse.model_validate(json.loads(cleaned))

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
