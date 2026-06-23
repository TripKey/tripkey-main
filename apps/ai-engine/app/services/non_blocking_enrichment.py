from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime

from app.prompts.non_blocking_enrichment import build_non_blocking_enrichment_prompt
from app.schemas.non_blocking_enrichment import (
    EnrichmentPatch,
    NonBlockingEnrichmentRequest,
    NonBlockingEnrichmentResponse,
)
from app.schemas.parse import AlertCardResponse, AlertCategory, Category, FlightRole
from app.services.core_parse import _call_gemini, _extract_json, _parse_alert_cards

logger = logging.getLogger(__name__)

SAFE_PATCH_FIELDS = {"tips", "estimated_duration_min", "tags", "user_context"}


def _parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _insight_alert(alert_type: str, message: str) -> AlertCardResponse:
    return AlertCardResponse(
        id=str(uuid.uuid4()),
        type=alert_type,
        category=AlertCategory.INSIGHT,
        scope="trip",
        day=None,
        message=message,
        related_instance_ids=None,
    )


def _build_transport_alerts(req: NonBlockingEnrichmentRequest) -> list[AlertCardResponse]:
    card = req.card
    if card.category != Category.TRANSPORT:
        return []

    departure_time = _parse_iso_datetime(card.flight_datetime)
    if not departure_time:
        return []

    alerts: list[AlertCardResponse] = []
    hour = departure_time.hour
    if card.flight_role == FlightRole.OUTBOUND and hour >= 18:
        alerts.append(
            _insight_alert(
                "late_arrival_notice",
                f"{card.name} 출발 시간이 저녁이라 첫날 일정은 가볍게 잡는 편이 좋아요.",
            )
        )
    elif card.flight_role == FlightRole.INBOUND and hour < 12:
        alerts.append(
            _insight_alert(
                "early_return_notice",
                f"{card.name} 출발 시간이 오전이라 마지막 날 이동 시간을 먼저 확보하는 편이 좋아요.",
            )
        )

    return alerts


def _build_patch_suggestions(req: NonBlockingEnrichmentRequest) -> list[EnrichmentPatch]:
    card = req.card
    patches: list[EnrichmentPatch] = []

    if card.category in {Category.PLACE, Category.ACTIVITY, Category.FOOD} and not card.tips:
        patches.append(
            EnrichmentPatch(
                field="tips",
                value="방문 전 운영시간과 휴무일을 한 번 확인해보세요.",
                apply_mode="suggestion",
                confidence="medium",
                reason="운영시간은 여행 당일 변동될 수 있어 검토용 제안으로만 제공합니다.",
            )
        )

    return patches


def _fallback_response(req: NonBlockingEnrichmentRequest) -> NonBlockingEnrichmentResponse:
    return NonBlockingEnrichmentResponse(
        card_instance_id=req.card.instance_id,
        patches=_build_patch_suggestions(req),
        alert_cards=_build_transport_alerts(req),
    )


def _parse_patches(raw_patches: list[dict]) -> list[EnrichmentPatch]:
    patches: list[EnrichmentPatch] = []
    for raw_patch in raw_patches:
        if not isinstance(raw_patch, dict):
            logger.warning("Skipping non-object enrichment patch | raw=%s", raw_patch)
            continue

        field = raw_patch.get("field")
        if field not in SAFE_PATCH_FIELDS:
            logger.warning("Skipping unsafe enrichment patch field=%s | raw=%s", field, raw_patch)
            continue

        if raw_patch.get("apply_mode") != "suggestion":
            logger.warning("Skipping non-suggestion enrichment patch | raw=%s", raw_patch)
            continue

        try:
            patches.append(EnrichmentPatch.model_validate(raw_patch))
        except Exception as exc:
            logger.warning("Skipping invalid enrichment patch | error=%s | raw=%s", exc, raw_patch)
    return patches


def _uuid_or_none(value: str | None) -> str | None:
    if not value:
        return None
    try:
        uuid.UUID(value)
    except ValueError:
        return None
    return value


def _attach_current_card_relation(
    alerts: list[AlertCardResponse],
    req: NonBlockingEnrichmentRequest,
) -> list[AlertCardResponse]:
    instance_id = _uuid_or_none(req.card.instance_id)
    if not instance_id:
        return alerts

    related_alerts: list[AlertCardResponse] = []
    for alert in alerts:
        if alert.related_instance_ids:
            related_alerts.append(alert)
            continue
        related_alerts.append(alert.model_copy(update={"related_instance_ids": [instance_id]}))
    return related_alerts


def _parse_ai_response(raw_text: str, req: NonBlockingEnrichmentRequest) -> NonBlockingEnrichmentResponse:
    parsed = _extract_json(raw_text)

    raw_patches = parsed.get("patches", [])
    if raw_patches is None:
        raw_patches = []
    if not isinstance(raw_patches, list):
        raise ValueError("patches must be an array when provided.")

    raw_alerts = parsed.get("alert_cards", [])
    if raw_alerts is None:
        raw_alerts = []
    if not isinstance(raw_alerts, list):
        raise ValueError("alert_cards must be an array when provided.")

    card_instance_id = parsed.get("card_instance_id", req.card.instance_id)
    if card_instance_id is not None and not isinstance(card_instance_id, str):
        card_instance_id = req.card.instance_id

    return NonBlockingEnrichmentResponse(
        card_instance_id=card_instance_id,
        patches=_parse_patches(raw_patches),
        alert_cards=_attach_current_card_relation(_parse_alert_cards(raw_alerts), req),
    )


async def enrich_card_non_blocking(req: NonBlockingEnrichmentRequest) -> NonBlockingEnrichmentResponse:
    prompt = build_non_blocking_enrichment_prompt(req)
    try:
        raw_text = await asyncio.to_thread(_call_gemini, prompt)
        return _parse_ai_response(raw_text, req)
    except Exception as exc:
        logger.warning("Falling back to rule-based non-blocking enrichment | trip_id=%s | error=%s", req.trip_id, exc)
        return _fallback_response(req)
