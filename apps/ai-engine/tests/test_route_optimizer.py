import os

import pytest

os.environ.setdefault("GOOGLE_MAPS_API_KEY", "test-maps-key")

from app.schemas.route import Coord, RouteLeg, RouteLegResult, RouteRequest, RouteResponse


def test_schema_roundtrip() -> None:
    req = RouteRequest(legs=[RouteLeg(
        from_instance_id="a", to_instance_id="b",
        origin=Coord(lat=34.70, lng=135.50),
        destination=Coord(lat=34.67, lng=135.49),
    )])
    assert req.legs[0].origin.lat == 34.70
