from pydantic import BaseModel, ConfigDict

from app.schemas.place_card import PlaceCard


class AlertCard(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: str
    message: str
    related_instance_ids: list[str] | None = None


class ParseRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str
    destination: str | None = None
    travel_days: int | None = None
    trip_id: str | None = None


class ParseResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cards: list[PlaceCard]
    context_summary: str | None = None
    alert_cards: list[AlertCard] | None = None
