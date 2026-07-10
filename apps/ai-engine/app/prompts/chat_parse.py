from __future__ import annotations

import json

from app.schemas.chat_parse import ChatParseRequest


def build_chat_parse_prompt(req: ChatParseRequest) -> str:
    payload = req.model_dump(mode="json")
    return f"""
You are TripKey's conversational travel-place recommendation parser.
Return exactly one JSON object and no markdown code fence or commentary.

Choose exactly one intent:
- update_context: the user only states a preference or constraint and does not request places.
  Examples: "너무 많이 걷고 싶진 않아", "쇼핑을 좋아해".
- generate_cards: the user requests concrete place recommendations. When ambiguous, prefer this intent.
  Examples: "실내 장소 넣어줘", "초밥집 후보 더 보고 싶어", "맛집 추천해줘".
- need_clarification: a decisive detail is genuinely missing. Use rarely; destinations are already known.
  Examples: "그거 해줘" with no identifiable referent, "아까 말한 조건 반대로" with no usable context.
- no_action: the request only repeats an existing place, or clearly declares a user-chosen place.
  Examples: "이미 있는 쿠로몬 시장 다시 넣어줘", "친구집에 갈 거야".

Rules:
1. Only generate cards for generate_cards. Generate at most max_cards concrete, real venues.
2. Do not create generic category/region cards. Do not create accommodation or transport cards.
3. Do not invent place_id or coordinates; enrichment supplies them.
4. Do not recommend a place that is identical or effectively identical to existing_cards. Report it in
   duplicates as {{"name": "the candidate name", "reason": "already_exists"}}.
5. Put the recommendation rationale in user_context.
6. reply must be 1-2 Korean sentences and must not state a numeric count of cards.
7. Merge new preferences/constraints into context and always return the complete updated_context.
8. A clear declaration such as "친구집에 갈 거야" or "예약해둔 OO 갈 거임" is no_action and reply must
   guide the user to 카드 목록의 '직접 추가'. If there is any ambiguity, prefer generate_cards.

JSON shape:
{{
  "intent": "update_context|generate_cards|need_clarification|no_action",
  "reply": "Korean reply",
  "updated_context": {{"interests": [], "constraints": []}},
  "cards": [
    {{
      "name": "concrete venue name",
      "category": "place|activity|food|etc",
      "estimated_duration_min": 60,
      "location": "area or neighborhood",
      "time_constraint": null,
      "user_context": "recommendation rationale",
      "tips": null,
      "tags": [],
      "search_alias": null
    }}
  ],
  "duplicates": [{{"name": "candidate name", "reason": "already_exists"}}]
}}

Input:
{json.dumps(payload, ensure_ascii=False)}
""".strip()
