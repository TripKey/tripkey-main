from __future__ import annotations

import uuid
from datetime import datetime

from app.schemas.non_blocking_enrichment import (
    EnrichmentPatch,
    NonBlockingEnrichmentRequest,
    NonBlockingEnrichmentResponse,
)
from app.schemas.parse import AlertCardResponse, AlertCategory, Category, FlightRole


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


async def enrich_card_non_blocking(req: NonBlockingEnrichmentRequest) -> NonBlockingEnrichmentResponse:
    return NonBlockingEnrichmentResponse(
        card_instance_id=req.card.instance_id,
        patches=_build_patch_suggestions(req),
        alert_cards=_build_transport_alerts(req),
    )
