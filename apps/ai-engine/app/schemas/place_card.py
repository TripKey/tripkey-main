from pydantic import BaseModel


class Coordinates(BaseModel):
    lat: float
    lng: float


class PlaceCard(BaseModel):
    place_id: str
    instance_id: str
    name: str
    category: str
    classification: str
    estimated_duration_min: int
    coordinates: Coordinates
    status: str
