from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status

from app.schemas.non_blocking_enrichment import NonBlockingEnrichmentRequest, NonBlockingEnrichmentResponse
from app.services.non_blocking_enrichment import enrich_card_non_blocking

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/internal/ai/enrich", tags=["enrichment"])


@router.post(
    "/non-blocking/card",
    response_model=NonBlockingEnrichmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Card-level non-blocking enrichment",
)
async def non_blocking_card_endpoint(req: NonBlockingEnrichmentRequest) -> NonBlockingEnrichmentResponse:
    try:
        return await enrich_card_non_blocking(req)
    except Exception as exc:
        logger.exception("Non-blocking enrichment failed | trip_id=%s", req.trip_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Non-blocking enrichment failed.",
        ) from exc
