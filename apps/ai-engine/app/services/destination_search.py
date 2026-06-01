"""Google Places Autocomplete v1 기반 목적지 검색.

설계 노트: 카드 보강용 Places(`places:searchText`)와 분리해 도시/지역 타이프어헤드
용도로 `places:autocomplete` 를 호출한다. country 는 응답의
``structuredFormat.secondaryText`` 그대로 사용한다(languageCode=ko 기준 보통 국가명).
"""

from __future__ import annotations

import os

import httpx

from app.schemas.destination_search import Destination

PLACES_AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete"


def _places_api_key() -> str | None:
    return os.getenv("GOOGLE_PLACES_API_KEY") or os.getenv("GOOGLE_MAPS_API_KEY")


async def search_destinations(query: str) -> list[Destination]:
    api_key = _places_api_key()
    if not api_key:
        raise RuntimeError("GOOGLE_MAPS_API_KEY is not configured")

    headers = {
        "X-Goog-Api-Key": api_key,
        "Content-Type": "application/json",
    }
    payload = {
        "input": query,
        "languageCode": "ko",
        "includedPrimaryTypes": ["(cities)"],
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(PLACES_AUTOCOMPLETE_URL, json=payload, headers=headers)

    response.raise_for_status()
    data = response.json() or {}
    suggestions = data.get("suggestions") or []

    results: list[Destination] = []
    for suggestion in suggestions:
        prediction = suggestion.get("placePrediction") if isinstance(suggestion, dict) else None
        if not prediction:
            continue
        structured = prediction.get("structuredFormat") or {}
        main_text = (structured.get("mainText") or {}).get("text")
        secondary_text = (structured.get("secondaryText") or {}).get("text")
        place_id = prediction.get("placeId")
        if not main_text or not place_id:
            continue
        results.append(
            Destination(name=main_text, country=secondary_text, place_id=place_id)
        )
    return results
