from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.parse import Coordinates

TravelMode = Literal["walking", "transit", "driving", "estimated"]
RouteSource = Literal["google", "estimated"]


class RouteLeg(BaseModel):
    model_config = ConfigDict(extra="forbid")

    from_instance_id: str = Field(..., min_length=1)
    to_instance_id: str = Field(..., min_length=1)
    origin: Coordinates
    destination: Coordinates


class RouteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    legs: list[RouteLeg]


class RouteLegResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    from_instance_id: str
    to_instance_id: str
    duration_seconds: int
    distance_meters: int
    mode: TravelMode
    source: RouteSource


class RouteResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    legs: list[RouteLegResult]
