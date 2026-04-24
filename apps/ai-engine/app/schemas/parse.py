from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class Category(str, Enum):
    PLACE = "place"
    ACTIVITY = "activity"
    TRANSPORT = "transport"
    ACCOMMODATION = "accommodation"
    FOOD = "food"
    ETC = "etc"


class Classification(str, Enum):
    CONFIRMED = "confirmed"
    OPEN_QUESTION = "open_question"
    UNDECIDED = "undecided"
    UNASSIGNED = "unassigned"


class PlacementStatus(str, Enum):
    READY = "ready"
    READY_PARTIAL = "ready_partial"
    NEEDS_INPUT = "needs_input"
    BLOCKED = "blocked"


class AlertCategory(str, Enum):
    PRACTICAL = "practical"
    INSIGHT = "insight"


class AccommodationInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Optional[str] = None
    location: Optional[str] = None
    check_in: Optional[str] = None
    check_out: Optional[str] = None


class FlightInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    departure_airport: Optional[str] = None
    arrival_airport: Optional[str] = None
    flight_number: Optional[str] = None
    datetime: Optional[str] = None


class ParseRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    trip_id: str
    dump_text: str
    destinations: list[str] = Field(min_length=1)
    travel_days: int = Field(ge=1)
    companion_count: int = Field(ge=1)
    accommodation_inputs: list[AccommodationInput] = Field(default_factory=list)
    departure_flight: Optional[FlightInput] = None
    return_flight: Optional[FlightInput] = None


class Coordinates(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lat: float
    lng: float


class CardResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    category: Category
    classification: Classification
    placement_status: PlacementStatus

    is_ai_generated: bool
    allow_duplicate: bool

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
    search_alias: Optional[str] = None

    check_in: Optional[str] = None
    check_out: Optional[str] = None
    flight_number: Optional[str] = None


class AlertCardResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    type: str
    category: AlertCategory
    scope: str = "trip"
    day: Optional[int] = None
    message: str
    related_instance_ids: Optional[list[str]] = None


class ParseResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    trip_id: str
    parse_version: str = "3.2.0"
    context_summary: str
    cards: list[CardResponse] = Field(min_length=1)
    alert_cards: list[AlertCardResponse] = Field(default_factory=list)
