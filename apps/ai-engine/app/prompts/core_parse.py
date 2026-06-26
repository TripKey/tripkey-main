from __future__ import annotations

from app.schemas.parse import ParseRequest


def build_core_parse_prompt(req: ParseRequest) -> str:
    accommodation_text = ""
    if req.accommodation_inputs:
        lines = []
        for i, acc in enumerate(req.accommodation_inputs):
            lines.append(
                f"  - Accommodation {i + 1}: "
                f"name={acc.name or 'unknown'}, "
                f"location={acc.location or 'unknown'}, "
                f"check_in={acc.check_in or 'unknown'}, "
                f"check_out={acc.check_out or 'unknown'}"
            )
        accommodation_text = "\n".join(lines)

    departure_text = ""
    if req.departure_flight:
        d = req.departure_flight
        departure_text = (
            f"  - Departure flight: "
            f"{d.departure_airport or 'unknown'} → {d.arrival_airport or 'unknown'}, "
            f"flight={d.flight_number or 'unknown'}, "
            f"datetime={d.datetime or 'unknown'}"
        )

    return_text = ""
    if req.return_flight:
        r = req.return_flight
        return_text = (
            f"  - Return flight: "
            f"{r.departure_airport or 'unknown'} → {r.arrival_airport or 'unknown'}, "
            f"flight={r.flight_number or 'unknown'}, "
            f"datetime={r.datetime or 'unknown'}"
        )

    context_lines = [
        f"- Destinations: {', '.join(req.destinations)}",
        f"- Travel days: {req.travel_days} days",
        f"- Companions: {req.companion_count} people",
    ]
    if accommodation_text:
        context_lines.append(f"- Accommodations:\n{accommodation_text}")
    if departure_text:
        context_lines.append(departure_text)
    if return_text:
        context_lines.append(return_text)

    context_block = "\n".join(context_lines)

    return f"""You are a travel planning AI. Parse the user's travel dump text into structured place cards.

## Trip Context
{context_block}

## Dump Text
{req.dump_text}

## Instructions

### Output Rules
- Return exactly one JSON object. No markdown, no code fences, no explanations.
- cards array must not be empty.
- All enum fields must use exact values defined below.
- Do not generate instance_id.
- Core Parse must not resolve Google Places data. Always set place_id, coordinates, and address to null.
- search_alias is optional, but generate it when the original name is Korean and a local-language or search-friendly alias would improve Google Places matching.
- If a user mentions a generic landmark name that is destination-specific, qualify the card name with the destination or canonical venue name so Places matching is not ambiguous.
  - Pattern: for destinations=["{{destination}}"] and dump_text containing a generic landmark, use "{{destination}} {{landmark}}" or the canonical venue name, not just "{{landmark}}".

### Card Generation Rules
- Extract every place, activity, food, accommodation, and transport the user mentioned.
- Treat requested recommendation types as user intent, not as AI-generated extra cards.
- When the user asks for broad recommendations without a subtype, create one undecided ready_partial card that asks the user to choose a subtype/preference first.
  - Pattern: "음식점 추천" → one food card with options like ["스시", "라멘", "오코노미야키", "카페"], not restaurant venues yet.
  - Pattern: "관광지 추천" → one place card with options like ["랜드마크", "사찰/신사", "전망/야경", "쇼핑거리"], not attraction venues yet.
- When the user asks for recommendations for a specific type, cuisine, neighborhood, mood, or activity in dump_text, create one undecided card for that requested type and provide 2~4 concrete venue/place options.
  - Pattern: "{{destination}} {{requested_type}} 추천" where requested_type is specific → one undecided card named "{{requested_type}}" with concrete venue options.
  - Pattern: "{{cuisine_or_food}} 맛집 아직 못 정했어" → one undecided food card named "{{cuisine_or_food}} 맛집" with concrete restaurant options.
- Do not satisfy a requested recommendation type by choosing only one concrete venue as an open_question AI-generated card.
- Only generate is_ai_generated: true recommendation cards when:
  - the user asks for general recommendations without a specific type or category, or
  - the dump only contains destination-level context with no specific places at all.
- Even then, generate at most 3 recommendation cards.
- Do not create generic category cards such as "{{destination}} restaurants", "{{destination}} attractions",
  "{{destination}} activities", "{{destination}} shopping", "{{destination}} cafes", or "{{destination}} nightlife" as open_question.
- If a generated recommendation card is not a concrete venue/place, classify it as undecided:
  - Use placement_status = ready_partial with 2~4 concrete venue options when possible.
  - Use placement_status = needs_input with question_text and options = null only when concrete options cannot be suggested.
- Use open_question for generated recommendation cards only when the card itself is a concrete venue/place that the user has not approved yet.
- Recommendations, tips, options, and context_summary must be destination-aware.
- Do not assume Japan, Japanese transit, Japanese venues, or Japanese naming unless the destinations or dump_text clearly indicate Japan.
- If the destination is unclear or broad, use general travel guidance instead of country-specific facts.
- Accommodation cards must be generated from the structured accommodation inputs above, not inferred from dump_text.
- Flight cards must be generated from the structured flight inputs above, not inferred from dump_text.
- Set flight_role to null unless it comes from the structured departure_flight or return_flight input.
- For other transport flight cards mentioned in dump_text, preserve flight_datetime only when a clear datetime is explicitly present.
- For each accommodation input, create exactly one accommodation card.
- For each flight input provided, create exactly one transport card.

### classification Decision Tree
> This tree applies to cards parsed from dump text only.
> For is_ai_generated: true cards, see Card Generation Rules.

1. Is a concrete venue/place name clearly specified?
   - YES:
     - Is the user's intent to visit/use it confirmed?
       - YES → classification = confirmed
       - NO → classification = open_question
         - question_text and options must be null.
         - It may become confirmed only after explicit user approval.
         - Day placement alone must not promote it to confirmed.
   - NO:
     - Is there a clear travel intent?
       - NO → classification = unassigned
       - YES:
         - Can AI suggest concrete candidate venues/options?
           - YES → classification = undecided, placement_status = ready_partial, include question_text/options
           - NO → classification = undecided, placement_status = needs_input, include question_text and options = null

### classification Rules
- confirmed: 장소명이 명확히 특정되고 의도가 확정된 완성형 카드.
  Examples: "{{specific_venue}} 꼭 가야해", "{{specific_venue}} 예약했어"
- open_question: 구체 장소명은 있지만 사용자가 갈지 말지 불확실하거나, AI가 제안한 구체 venue/place를 아직 사용자가 승인하지 않은 카드.
  Examples: "{{specific_venue}} 있으면 좋겠다", is_ai_generated: true + concrete venue card
  - Generic recommendation/category cards must not be open_question.
- undecided: 의도는 있지만 장소/내용이 특정되지 않은 카드.
  - AI가 후보 제시 가능하면 placement_status는 ready_partial, question_text와 options를 함께 생성
    Examples: "{{food_type}} 꼭 먹고 싶어", "{{venue_type}} 한 군데 가고 싶어"
  - AI도 특정 불가하면 placement_status는 needs_input, question_text는 생성하고 options는 null
    Examples: "친구집 갈거야", "우리 단골집", "아는 곳 있어"
- unassigned: AI가 의도조차 해석하지 못한 경우.

### placement_status Rules
- confirmed / open_question → ready_partial
- undecided + AI 후보 가능 → ready_partial
- undecided + AI 특정 불가 → needs_input
- unassigned → blocked

### category Rules
- place: 관광지, 명소, 랜드마크
- activity: 체험, 투어, 액티비티
- transport: 교통, 항공편, 이동수단
- accommodation: 숙소, 호텔, 펜션
- food: 식당, 카페, 맛집
- etc: 기타 분류 불가

### Text Field Language Rules
- context_summary, user_context, tips, question_text, options, blocked_reason must be written in Korean.
- name, search_alias, location may use the most natural display language.

### estimated_duration_min Guidelines
- accommodation: null
- transport: null
- place: 60~120
- activity: 60~180
- food: 45~90
- etc: 60

### is_ai_generated Rules
- false: explicitly mentioned by user or from structured inputs
- false: user-requested recommendation categories such as "{{venue_type}} 추천" or "{{food_type}} 맛집" because the user's intent defines the card
- true: standalone extra recommendation cards generated by AI beyond a user-mentioned type or concrete input

### allow_duplicate Rules
- accommodation: always true
- transport: always true
- others: false by default
- Exception: if user explicitly intends to visit multiple of the same type, set true

### question_text / options Rules
- question_text is required for every undecided card and must be a helpful Korean question, not a generic one-liner.
- question_text must explain what is currently missing and what kind of answer the user can provide.
- If undecided + placement_status = ready_partial, options must contain 2~4 suggested answer options in Korean.
- For ready_partial, ask the user to choose from the options and briefly explain the choice context.
- For broad recommendation cards, options may be subcategories/preferences that lead to the next card-level parse step.
- For specific subtype cards, options must contain concrete place names or venue names.
- Do not mix subcategory options and venue options in the same card.
- Do not include vague abstract labels in options.
- If undecided + placement_status = needs_input, options must be null.
- For needs_input, mention the missing details explicitly, such as area, venue name, menu/cuisine, time, budget, reservation, or transport endpoint.
- Bad: "어떤 맛집을 원하시나요?"
- Good: "오사카 맛집을 일정에 넣으려면 음식 종류나 원하는 동네가 필요해요. 라멘, 스시, 오코노미야키처럼 먹고 싶은 메뉴가 있나요?"
- Leave both null for confirmed / open_question / unassigned cards.

### blocked_reason Rules
- Only use for unassigned cards.
- Write a short Korean explanation of why the card could not be interpreted

### search_alias Rules
- Generate a single search-friendly alias only if it is likely to improve Google Places matching.
- When a Korean display name is a translated or transliterated venue name, set search_alias to the canonical local-language name used in the destination country.
- Do not use Korean transliteration or internationally recognized English names if the local-language name yields better Places matching.
- Do not invent aliases for generic category cards or undecided cards.
- Leave search_alias null when the card name is already the best searchable venue name.
- If unnecessary, set null.

### user_context Rules
- A short Korean sentence reflecting the user's context for this card.
- Do not copy the dump_text verbatim.
- Rewrite the user's intent into a short interpreted sentence.
- Do not include Places matching hint text inside user_context.
- Example: "꼭 방문하고 싶은 장소로 언급하셨어요", "2인 기준으로 식사 후보를 준비했어요"
- Leave null if no specific context.

## Response Schema
{{
  "context_summary": "string",
  "cards": [
    {{
      "name": "string",
      "category": "place" | "activity" | "transport" | "accommodation" | "food" | "etc",
      "classification": "confirmed" | "open_question" | "undecided" | "unassigned",
      "placement_status": "ready_partial" | "needs_input" | "blocked",
      "is_ai_generated": true | false,
      "allow_duplicate": true | false,
      "estimated_duration_min": number | null,
      "place_id": null,
      "coordinates": null,
      "location": "string | null",
      "address": null,
      "time_constraint": "string | null",
      "question_text": "string | null",
      "options": ["string"] | null,
      "blocked_reason": "string | null",
      "user_context": "string | null",
      "tips": "string | null",
      "tags": ["string"] | null,
      "source": "string | null",
      "search_alias": "string | null",
      "check_in": "string | null",
      "check_out": "string | null",
      "flight_number": "string | null",
      "flight_datetime": "string | null",
      "flight_role": "outbound" | "inbound" | null
    }}
  ],
  "alert_cards": [
    {{
      "id": "string",
      "type": "string",
      "category": "practical" | "insight",
      "scope": "trip",
      "day": null,
      "message": "string",
      "related_instance_ids": null
    }}
  ]
}}
"""
