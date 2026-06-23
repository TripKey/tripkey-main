from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Coordinates(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lat: float
    lng: float


PlaceCategory = Literal[
    "attraction",
    "shopping",
    "dining",
    "accommodation",
    "transportation",
    "uncategorized",
]

PlaceClassification = Literal[
    "confirmed",
    "open_question",
    "undecided",
    "unassigned",
]

PlaceStatus = Literal["loading", "success", "error"]


class PlaceCard(BaseModel):
    model_config = ConfigDict(extra="forbid")

    place_id: str
    name: str
    category: PlaceCategory
    classification: PlaceClassification
    status: PlaceStatus
    estimated_duration_min: int | None = Field(default=None, ge=0, le=1440)
    coordinates: Coordinates | None = None
    time_constraint: str | None = None
    is_ai_generated: bool | None = None
    conflict_type: str | None = None
    conflict_reason: str | None = None
    remind: list[str] | None = None

    @model_validator(mode="after")
    def validate_success_card(self) -> "PlaceCard":
        if self.status == "success" and self.estimated_duration_min is None:
            raise ValueError(
                "estimated_duration_min is required when status is success"
            )

        if self.status == "error" and self.classification != "unassigned":
            raise ValueError(
                "classification must be unassigned when status is error"
            )

        return self
