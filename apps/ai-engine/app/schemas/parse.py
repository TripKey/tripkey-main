from pydantic import BaseModel, ConfigDict

from app.schemas.place_card import PlaceCard


class AlertCard(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: str
    message: str
    related_instance_ids: list[str] | None = None


class ParseRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    trip_id: str
    dump_text: str


class ParseResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cards: list[PlaceCard]
    context_summary: str | None = None
    alert_cards: list[AlertCard] | None = None
