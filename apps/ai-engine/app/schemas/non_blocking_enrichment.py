from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.parse import AlertCardResponse, Category, Classification, Coordinates, FlightRole, PlacementStatus


class EnrichmentCardSnapshot(BaseModel):
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
    user_context: Optional[str] = None
    tips: Optional[str] = None
    tags: Optional[list[str]] = None
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    flight_number: Optional[str] = None
    flight_datetime: Optional[str] = None
    flight_role: Optional[FlightRole] = None


class NonBlockingEnrichmentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    trip_id: str
    destinations: list[str] = Field(default_factory=list)
    travel_days: Optional[int] = None
    companion_count: Optional[int] = None
    card: EnrichmentCardSnapshot


class EnrichmentPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    field: str
    value: Any
    apply_mode: Literal["auto", "suggestion"]
    confidence: Literal["high", "medium", "low"]
    reason: str


class NonBlockingEnrichmentResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    card_instance_id: Optional[str] = None
    patches: list[EnrichmentPatch] = Field(default_factory=list)
    alert_cards: list[AlertCardResponse] = Field(default_factory=list)
