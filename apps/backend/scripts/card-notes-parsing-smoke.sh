#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080/v1}"
NOTES="${NOTES:-도톤보리 글리코 사인으로 갈게}"
POLL_INTERVAL_SECONDS="${POLL_INTERVAL_SECONDS:-2}"
POLL_ATTEMPTS="${POLL_ATTEMPTS:-15}"

usage() {
  cat <<'USAGE'
Card-level notes parsing smoke test.

Required env:
  TRIP_ID       Trip UUID
  CARD_ID       Card instance UUID

Optional env:
  BASE_URL                 Backend base URL. Default: http://localhost:8080/v1
  NOTES                    Notes text to PATCH.
  POLL_INTERVAL_SECONDS    Poll interval. Default: 2
  POLL_ATTEMPTS            Poll attempts. Default: 15

Example:
  TRIP_ID=... CARD_ID=... NOTES="친구 집은 오사카 난바역 근처야" \
    ./apps/backend/scripts/card-notes-parsing-smoke.sh

Expected:
  - PATCH returns processing_status=processing for eligible cards:
    undecided+needs_input, undecided+ready_partial, or processing_status=failed.
  - Polling eventually returns:
    confirmed+completed when AI parse and Places lookup both succeed, or
    confirmed+failed when AI parse succeeds but Places lookup misses, or
    previous classification/placement + failed when AI parse fails or returns non-confirmed.
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ -z "${TRIP_ID:-}" || -z "${CARD_ID:-}" ]]; then
  usage >&2
  exit 2
fi

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 2
  fi
}

require_command curl
require_command python3

json_body() {
  NOTES="$NOTES" python3 - <<'PY'
import json
import os

print(json.dumps({"notes": os.environ["NOTES"]}, ensure_ascii=False))
PY
}

extract_card_summary() {
  local payload
  payload="$(cat)"
  CARD_ID="$CARD_ID" PAYLOAD="$payload" python3 - <<'PY'
import json
import os

payload = json.loads(os.environ["PAYLOAD"])
card_id = os.environ["CARD_ID"]
cards = payload.get("cards", [])
card = next((item for item in cards if item.get("instance_id") == card_id), None)

if card is None:
    print(f"card_not_found instance_id={card_id}")
    sys.exit(3)

fields = [
    "instance_id",
    "name",
    "classification",
    "placement_status",
    "processing_status",
    "action_type",
    "place_id",
    "address",
    "notes",
    "memo",
]

for field in fields:
    print(f"{field}={card.get(field)!r}")
PY
}

extract_processing_status() {
  local payload
  payload="$(cat)"
  CARD_ID="$CARD_ID" PAYLOAD="$payload" python3 - <<'PY'
import json
import os
import sys

payload = json.loads(os.environ["PAYLOAD"])
card_id = os.environ["CARD_ID"]

if "cards" in payload:
    card = next((item for item in payload.get("cards", []) if item.get("instance_id") == card_id), None)
else:
    card = payload

if card is None:
    print("card_not_found")
    sys.exit(3)

print(card.get("processing_status"))
PY
}

patch_url="${BASE_URL%/}/trips/${TRIP_ID}/cards/${CARD_ID}"
cards_url="${BASE_URL%/}/trips/${TRIP_ID}/cards"
body="$(json_body)"

echo "PATCH $patch_url"
echo "Request body: $body"

patch_response="$(curl -sS -X PATCH "$patch_url" \
  -H 'Content-Type: application/json' \
  -d "$body")"

echo
echo "PATCH response:"
printf '%s\n' "$patch_response" | python3 -m json.tool

patch_status="$(printf '%s\n' "$patch_response" | extract_processing_status)"
echo
echo "Initial processing_status=$patch_status"

echo
echo "Polling $cards_url"
last_response=""
for attempt in $(seq 1 "$POLL_ATTEMPTS"); do
  sleep "$POLL_INTERVAL_SECONDS"
  last_response="$(curl -sS "$cards_url")"
  current_status="$(printf '%s\n' "$last_response" | extract_processing_status)"

  echo "attempt=$attempt processing_status=$current_status"

  if [[ "$current_status" != "processing" && "$current_status" != "pending" ]]; then
    echo
    echo "Final card summary:"
    printf '%s\n' "$last_response" | extract_card_summary
    exit 0
  fi
done

echo
echo "Timed out before processing completed. Last card summary:"
printf '%s\n' "$last_response" | extract_card_summary
exit 1
