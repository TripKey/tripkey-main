from pydantic import BaseModel, Field


class DestinationSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)


class Destination(BaseModel):
    name: str
    country: str | None = None
    place_id: str


class DestinationSearchResponse(BaseModel):
    results: list[Destination]
