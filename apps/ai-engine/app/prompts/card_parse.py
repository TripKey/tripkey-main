from __future__ import annotations

import json

from app.schemas.card_parse import CardParseRequest


def build_card_parse_prompt(req: CardParseRequest) -> str:
    card_snapshot = json.dumps(
        req.card.model_dump(mode="json"), ensure_ascii=False, indent=2
    )
    destinations = ", ".join(req.destinations) if req.destinations else "unknown"
    travel_days = req.travel_days if req.travel_days is not None else "unknown"
    companion_count = (
        req.companion_count if req.companion_count is not None else "unknown"
    )

    return f"""You are a travel planning AI. Re-parse one existing place card using the user's latest natural-language input.

## Trip Context
- Destinations: {destinations}
- Travel days: {travel_days}
- Companions: {companion_count}

## Existing Card Snapshot
{card_snapshot}

## User Input
{req.natural_language_input}

## Task
Return one updated card JSON object only. No markdown, no code fences, no explanations.

## Decision Rules
- If the user input clearly identifies a concrete venue/place and intent to visit/use it, return classification="confirmed" and placement_status="ready_partial".
- If the input is meaningless, too vague, or cannot identify a concrete place, return classification="undecided".
- Do not return confirmed unless the concrete venue/place is clear from the input.
- The parser response must not invent Google Places data.
- For confirmed cards, place_id / coordinates / address are populated by Places lookup performed within this request. Do not set these fields manually.
- For confirmed cards, question_text and options must be null.
- For undecided cards, question_text is required.
- If undecided + ready_partial, options must contain 2~4 concrete candidate venue names.
- If undecided + needs_input, options must be null.
- If the existing card is a broad recommendation card and the user chooses a subtype/preference option, keep classification="undecided" and return ready_partial with 2~4 concrete venue/place options for that subtype.
- Only return confirmed when the user input identifies one concrete venue/place, not merely a subtype such as "스시", "라멘", "랜드마크", or "온천".
- For undecided cards, question_text must explain what is missing and what kind of answer the user can provide.
- For needs_input, mention the missing details explicitly, such as area, venue name, menu/cuisine, time, budget, reservation, or transport endpoint.
- Avoid generic one-liners like "어떤 장소를 원하시나요?"
- Preserve the original card category when reasonable, but update it if the input clearly indicates another category.
- Regenerate user_context and tips in Korean.
- Generate search_alias when it improves Google Places matching. Prefer canonical local-language names or search-friendly names.
- For Japanese venues, a romanized or Japanese local name is often better than Korean transliteration.

## Response Schema
{{
  "name": "string",
  "category": "place" | "activity" | "transport" | "accommodation" | "food" | "etc",
  "classification": "confirmed" | "undecided" | "unassigned",
  "placement_status": "ready_partial" | "needs_input" | "blocked",
  "is_ai_generated": false,
  "allow_duplicate": true | false,
  "estimated_duration_min": number | null,
  "place_id": "string | null",
  "coordinates": {{"lat": number, "lng": number}} | null,
  "location": "string | null",
  "address": "string | null",
  "time_constraint": "string | null",
  "question_text": "string | null",
  "options": ["string"] | null,
  "blocked_reason": "string | null",
  "user_context": "string | null",
  "tips": "string | null",
  "tags": ["string"] | null,
  "source": "string | null",
  "check_in": "string | null",
  "check_out": "string | null",
  "flight_number": "string | null",
  "flight_datetime": "string | null",
  "flight_role": "outbound" | "inbound" | null,
  "search_alias": "string | null"
}}
"""
