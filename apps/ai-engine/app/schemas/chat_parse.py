from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.parse import CardResponse


class ChatContext(BaseModel):
    model_config = ConfigDict(extra="ignore")

    interests: list[str] = Field(default_factory=list, max_length=20)
    constraints: list[str] = Field(default_factory=list, max_length=20)


class ExistingCardSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    category: str
    location: str | None = None
    place_id: str | None = None


class DuplicateItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    reason: Literal["already_exists"] = "already_exists"


class ChatParseRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    trip_id: str
    message: str = Field(min_length=1, max_length=500)
    destinations: list[str] = Field(min_length=1)
    travel_days: int = Field(ge=1)
    companion_count: int = Field(ge=1)
    context: ChatContext = Field(default_factory=ChatContext)
    existing_cards: list[ExistingCardSummary] = Field(default_factory=list)
    max_cards: int = Field(default=3, ge=1, le=3)


ChatIntent = Literal[
    "update_context",
    "generate_cards",
    "need_clarification",
    "no_action",
]


class ChatParseResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    intent: ChatIntent
    reply: str
    updated_context: ChatContext
    cards: list[CardResponse] = Field(default_factory=list)
    duplicates: list[DuplicateItem] = Field(default_factory=list)
