from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status

from app.schemas.chat_parse import ChatParseRequest, ChatParseResponse
from app.services.chat_parse import parse_chat
from app.services.core_parse import GeminiCooldownError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/internal/ai", tags=["chat-parse"])


@router.post(
    "/parse/chat",
    response_model=ChatParseResponse,
    status_code=status.HTTP_200_OK,
    summary="Conversational place recommendation parse",
)
async def chat_parse_endpoint(req: ChatParseRequest) -> ChatParseResponse:
    try:
        return await parse_chat(req)
    except GeminiCooldownError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unhandled chat parse error | trip_id=%s", req.trip_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI chat parsing failed.",
        ) from exc
