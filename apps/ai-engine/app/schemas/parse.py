from typing import Optional

from pydantic import BaseModel

from app.schemas.place_card import PlaceCard


class ParseRequest(BaseModel):
    text: str
    destination: Optional[str] = None
    travel_days: Optional[int] = None


class ParseResponse(BaseModel):
    cards: list[PlaceCard]
    context_summary: str
