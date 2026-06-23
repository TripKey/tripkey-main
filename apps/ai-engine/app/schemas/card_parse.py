from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.parse import CardResponse, Category, Classification, Coordinates, FlightRole, PlacementStatus


class CardParseSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid")

    instance_id: Optional[str] = None
    name: str
    category: Category
    classification: Classification
    placement_status: PlacementStatus

    estimated_duration_min: Optional[int] = None
    place_id: Optional[str] = None
    coordinates: Optional[Coordinates] = None
    location: Optional[str] = None
    address: Optional[str] = None
    time_constraint: Optional[str] = None
    question_text: Optional[str] = None
    options: Optional[list[str]] = None
    blocked_reason: Optional[str] = None
    user_context: Optional[str] = None
    tips: Optional[str] = None
    tags: Optional[list[str]] = None
    source: Optional[str] = None
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    flight_number: Optional[str] = None
    flight_datetime: Optional[str] = None
    flight_role: Optional[FlightRole] = None
    search_alias: Optional[str] = None


class CardParseRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    trip_id: str
    destinations: list[str] = Field(default_factory=list)
    travel_days: Optional[int] = None
    companion_count: Optional[int] = None
    natural_language_input: str = Field(min_length=1)
    card: CardParseSnapshot


class CardParseResponse(CardResponse):
    model_config = ConfigDict(extra="forbid")

    search_alias: Optional[str] = None
