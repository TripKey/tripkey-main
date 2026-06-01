from fastapi import APIRouter, HTTPException, status

from app.schemas.destination_search import (
    DestinationSearchRequest,
    DestinationSearchResponse,
)
from app.services.destination_search import search_destinations

router = APIRouter(prefix="/internal/ai", tags=["destinations"])


@router.post("/destinations/search", response_model=DestinationSearchResponse)
async def search(req: DestinationSearchRequest) -> DestinationSearchResponse:
    try:
        results = await search_destinations(req.query)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="places_lookup_failed",
        ) from exc
    return DestinationSearchResponse(results=results)
