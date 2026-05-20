from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.schemas.non_blocking_enrichment import EnrichmentCardSnapshot, NonBlockingEnrichmentRequest
from app.schemas.parse import Category, Classification, FlightRole, PlacementStatus
from app.services import non_blocking_enrichment
from app.services.non_blocking_enrichment import enrich_card_non_blocking


def _raise_gemini_error(_: str) -> str:
    raise RuntimeError("boom")


@pytest.mark.asyncio
async def test_non_blocking_enrichment_uses_ai_alert_cards(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        non_blocking_enrichment,
        "_call_gemini",
        lambda _: """
        {
          "card_instance_id": "card-1",
          "patches": [],
          "alert_cards": [
            {
              "id": "alert-ai-1",
              "type": "missing_reservation_detail",
              "category": "practical",
              "scope": "trip",
              "day": null,
              "message": "예약 확정 여부를 확인해두면 좋아요.",
              "related_instance_ids": null
            }
          ]
        }
        """,
    )

    req = NonBlockingEnrichmentRequest(
        trip_id="trip-1",
        destinations=["오사카"],
        card=EnrichmentCardSnapshot(
            instance_id="card-1",
            name="스시집 예약",
            category=Category.FOOD,
            classification=Classification.CONFIRMED,
            placement_status=PlacementStatus.READY_PARTIAL,
            time_constraint="저녁",
        ),
    )

    result = await enrich_card_non_blocking(req)

    assert result.card_instance_id == "card-1"
    assert result.patches == []
    assert len(result.alert_cards) == 1
    assert result.alert_cards[0].id == "alert-ai-1"
    assert result.alert_cards[0].category.value == "practical"


@pytest.mark.asyncio
async def test_non_blocking_enrichment_filters_unsafe_ai_patches(monkeypatch: pytest.MonkeyPatch) -> None:
    card_id = str(uuid4())
    monkeypatch.setattr(
        non_blocking_enrichment,
        "_call_gemini",
        lambda _: """
        {
          "card_instance_id": "card-id-from-ai",
          "patches": [
            {
              "field": "address",
              "value": "일본 〒282-0004 치바현 나리타시 후루고메 1-1",
              "apply_mode": "auto",
              "confidence": "high",
              "reason": "Standard address for Narita International Airport."
            },
            {
              "field": "tips",
              "value": "방문 전 운영시간을 확인해보세요.",
              "apply_mode": "suggestion",
              "confidence": "medium",
              "reason": "운영시간은 변동될 수 있습니다."
            }
          ],
          "alert_cards": [
            {
              "id": "alert-ai-2",
              "type": "late_arrival_notice",
              "category": "practical",
              "scope": "trip",
              "day": null,
              "message": "도착 후 시내 이동 시간을 확인해 주세요.",
              "related_instance_ids": null
            }
          ]
        }
        """,
    )

    req = NonBlockingEnrichmentRequest(
        trip_id="trip-1",
        destinations=["도쿄"],
        card=EnrichmentCardSnapshot(
            instance_id=card_id,
            name="ICN → NRT",
            category=Category.TRANSPORT,
            classification=Classification.CONFIRMED,
            placement_status=PlacementStatus.READY,
        ),
    )

    result = await enrich_card_non_blocking(req)

    assert [patch.field for patch in result.patches] == ["tips"]
    assert result.patches[0].apply_mode == "suggestion"
    assert result.alert_cards[0].related_instance_ids == [card_id]


@pytest.mark.asyncio
async def test_non_blocking_enrichment_falls_back_to_trip_scope_insight_alert(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(non_blocking_enrichment, "_call_gemini", _raise_gemini_error)

    req = NonBlockingEnrichmentRequest(
        trip_id="trip-1",
        destinations=["도쿄"],
        travel_days=3,
        companion_count=2,
        card=EnrichmentCardSnapshot(
            instance_id="card-1",
            name="ICN → NRT",
            category=Category.TRANSPORT,
            classification=Classification.CONFIRMED,
            placement_status=PlacementStatus.READY,
            flight_datetime="2026-07-01T19:00:00+09:00",
            flight_role=FlightRole.OUTBOUND,
        ),
    )

    result = await enrich_card_non_blocking(req)

    assert result.card_instance_id == "card-1"
    assert len(result.alert_cards) == 1
    alert = result.alert_cards[0]
    assert alert.category.value == "insight"
    assert alert.scope == "trip"
    assert alert.day is None
    assert alert.related_instance_ids is None


@pytest.mark.asyncio
async def test_non_blocking_enrichment_keeps_name_change_as_suggestion_only(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(non_blocking_enrichment, "_call_gemini", _raise_gemini_error)

    req = NonBlockingEnrichmentRequest(
        trip_id="trip-1",
        destinations=["오사카"],
        card=EnrichmentCardSnapshot(
            instance_id="card-1",
            name="도톤보리",
            category=Category.PLACE,
            classification=Classification.CONFIRMED,
            placement_status=PlacementStatus.READY_PARTIAL,
        ),
    )

    result = await enrich_card_non_blocking(req)

    assert result.alert_cards == []
    assert result.patches[0].field == "tips"
    assert result.patches[0].apply_mode == "suggestion"


@pytest.mark.asyncio
async def test_non_blocking_enrichment_endpoint(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(non_blocking_enrichment, "_call_gemini", _raise_gemini_error)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/internal/ai/enrich/non-blocking/card",
            json={
                "trip_id": "trip-1",
                "destinations": ["도쿄"],
                "travel_days": 3,
                "companion_count": 2,
                "card": {
                    "instance_id": "card-1",
                    "name": "NRT → ICN",
                    "category": "transport",
                    "classification": "confirmed",
                    "placement_status": "ready",
                    "flight_datetime": "2026-07-03T09:00:00+09:00",
                    "flight_role": "inbound",
                },
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["card_instance_id"] == "card-1"
    assert body["alert_cards"][0]["category"] == "insight"
    assert body["alert_cards"][0]["scope"] == "trip"
    assert body["alert_cards"][0]["day"] is None
    assert body["alert_cards"][0]["related_instance_ids"] is None
