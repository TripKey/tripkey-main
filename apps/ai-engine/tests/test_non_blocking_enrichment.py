import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.schemas.non_blocking_enrichment import EnrichmentCardSnapshot, NonBlockingEnrichmentRequest
from app.schemas.parse import Category, Classification, FlightRole, PlacementStatus
from app.services.non_blocking_enrichment import enrich_card_non_blocking


@pytest.mark.asyncio
async def test_non_blocking_enrichment_generates_trip_scope_insight_alert() -> None:
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
async def test_non_blocking_enrichment_keeps_name_change_as_suggestion_only() -> None:
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
async def test_non_blocking_enrichment_endpoint() -> None:
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
