from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv

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
    사용자 입력을 여행 일정 후보 카드로 파싱해줘.

    입력 정보:
    - text: {req.text}
    - destination: {req.destination}
    - travel_days: {req.travel_days}

    반드시 아래 조건을 모두 지켜.
    - 응답은 JSON 객체 하나만 반환한다.
    - 마크다운, 코드블록, 설명문, 주석을 포함하지 않는다.
    - cards 배열은 비우지 않는다.
    - 사용자가 도시명만 입력해도 대표 장소 후보를 최소 3개 이상 채운다.
    - 실존 가능성이 높은 장소만 반환한다.
    - 각 카드는 아래 스키마를 정확히 따른다.
    - classification 값은 confirmed 또는 unconfirmed 중 하나다.
    - status 값은 success 또는 failure 중 하나다.
    - estimated_duration_min 는 숫자로 반환한다.
    - coordinates.lat, coordinates.lng 는 숫자로 반환한다.

    응답 스키마:
    {{
      "cards": [
        {{
          "place_id": "string",
          "instance_id": "string",
          "name": "string",
          "category": "string",
          "classification": "confirmed" | "unconfirmed",
          "estimated_duration_min": number,
          "coordinates": {{
            "lat": number,
            "lng": number
          }},
          "status": "success" | "failure"
        }}
      ],
      "context_summary": "string"
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
    return ParseResponse.model_validate(json.loads(cleaned))


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
    except ValueError as e:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Gemini returned an empty response",
                "prompt": prompt,
                "error": str(e),
            },
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Failed to call Gemini",
                "prompt": prompt,
                "error": str(e),
            },
        ) from e

    try:
        return parse_gemini_response(raw)
    except (JSONDecodeError, ValueError) as e:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Gemini response did not match the expected schema",
                "raw": raw,
                "error": str(e),
            },
        ) from e
