import os

import pytest

os.environ.setdefault("GOOGLE_MAPS_API_KEY", "test-maps-key")

from pydantic import ValidationError

from app.schemas.parse import Coordinates
from app.schemas.route import RouteLeg, RouteLegResult, RouteRequest, RouteResponse


def test_schema_roundtrip() -> None:
    req = RouteRequest(legs=[RouteLeg(
        from_instance_id="a", to_instance_id="b",
        origin=Coordinates(lat=34.70, lng=135.50),
        destination=Coordinates(lat=34.67, lng=135.49),
    )])
    assert req.legs[0].origin.lat == 34.70


def test_route_leg_rejects_empty_instance_id() -> None:
    with pytest.raises(ValidationError):
        RouteLeg(
            from_instance_id="", to_instance_id="b",
            origin=Coordinates(lat=34.70, lng=135.50),
            destination=Coordinates(lat=34.67, lng=135.49),
        )


from app.fallback.estimated_route import estimate_leg


def test_estimate_leg_returns_estimated_source() -> None:
    leg = RouteLeg(
        from_instance_id="a", to_instance_id="b",
        origin=Coordinates(lat=34.70, lng=135.50),
        destination=Coordinates(lat=34.67, lng=135.49),
    )
    result = estimate_leg(leg)
    assert result.source == "estimated"
    assert result.mode == "estimated"
    assert result.distance_meters > 0
    assert result.duration_seconds > 0
    assert result.from_instance_id == "a"
