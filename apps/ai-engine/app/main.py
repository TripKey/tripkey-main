from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

import json
from json import JSONDecodeError
import time

from google.api_core.exceptions import ResourceExhausted
import google.genai as genai
import googlemaps
import os

load_dotenv()  # .env 파일에서 환경 변수 로드

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
gmaps = googlemaps.Client(key=os.getenv("GOOGLE_MAPS_API_KEY"))
GEMINI_COOLDOWN_SECONDS = int(os.getenv("GEMINI_COOLDOWN_SECONDS", "60"))
gemini_blocked_until = 0.0


class ParseRequest(BaseModel):
    text: str
    destination: str | None = None
    travel_days: int | None = None


app = FastAPI(title="TripKey AI Engine")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# --- [build prompt] --- #
def build_prompt(req: ParseRequest) -> str:
    return f"""
    사용자 입력을 여행 일정 후보로 파싱해줘.
    입력 {req.text} destination: {req.destination} travel_days: {req.travel_days}
    
    반드시 JSON 객체만 반환해줘.
    마크다운,설명문,코드블록을 절대 포함하지마.
    오로지 응답은 JSON 하나만 반환해.
    사용자 입력이 도시 단위로만 주어져도 cards를 최소 3개 이상 채워라.
    Cards를 비우지 마라.
    실존하는 대표 관광지 후보를 반환해라.
    형식:
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


def parse_gemini_response(raw: str) -> dict:
    cleaned = clean_gemini_response(raw)
    return json.loads(cleaned)


@app.post("/internal/ai/parse")
def parse_user_input(
    req: ParseRequest,
) -> dict:  ## 이후 pydantic BaseModel로 응답 스키마 정의 필요
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
    except JSONDecodeError as e:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Gemini response was not valid JSON",
                "raw": raw,
                "error": str(e),
            },
        ) from e
