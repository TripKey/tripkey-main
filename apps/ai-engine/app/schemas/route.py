from __future__ import annotations

from pydantic import BaseModel, Field


class Coord(BaseModel):
    lat: float
    lng: float


class RouteLeg(BaseModel):
    from_instance_id: str = Field(..., min_length=1)
    to_instance_id: str = Field(..., min_length=1)
    origin: Coord
    destination: Coord


class RouteRequest(BaseModel):
    legs: list[RouteLeg]


class RouteLegResult(BaseModel):
    from_instance_id: str
    to_instance_id: str
    duration_seconds: int
    distance_meters: int
    mode: str        # walking | transit | driving | estimated
    source: str      # google | estimated


class RouteResponse(BaseModel):
    legs: list[RouteLegResult]
