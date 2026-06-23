from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status

from app.schemas.card_parse import CardParseRequest, CardParseResponse
from app.schemas.parse import ParseRequest, ParseResponse
from app.services.core_parse import GeminiCooldownError, parse_card_level, parse_with_blocking_enrichment, to_public_card

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/internal/ai", tags=["parse"])


@router.post(
    "/parse",
    response_model=ParseResponse,
    status_code=status.HTTP_200_OK,
    summary="Core Parse + Blocking Enrichment",
)
async def parse_endpoint(req: ParseRequest) -> ParseResponse:
    logger.info("Parse request received | trip_id=%s", req.trip_id)

    try:
        result = await parse_with_blocking_enrichment(req)
    except GeminiCooldownError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.exception("Unhandled parse error | trip_id=%s", req.trip_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI parsing failed.",
        ) from exc

    return ParseResponse(
        trip_id=req.trip_id,
        context_summary=result.context_summary,
        cards=[to_public_card(card) for card in result.cards],
        alert_cards=result.alert_cards,
    )


@router.post(
    "/parse/card",
    response_model=CardParseResponse,
    status_code=status.HTTP_200_OK,
    summary="Card-level Parse",
)
async def parse_card_endpoint(req: CardParseRequest) -> CardParseResponse:
    logger.info("Card-level parse request received | trip_id=%s card=%s", req.trip_id, req.card.instance_id)

    try:
        card = await parse_card_level(req)
    except GeminiCooldownError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.exception("Unhandled card-level parse error | trip_id=%s card=%s", req.trip_id, req.card.instance_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI card parsing failed.",
        ) from exc

    return CardParseResponse.model_validate(card.model_dump())
