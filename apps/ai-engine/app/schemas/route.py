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


class OptimizeStop(BaseModel):
    model_config = ConfigDict(extra="forbid")

    instance_id: str = Field(..., min_length=1)
    coordinates: Coordinates
    # 고정 카드(pin): time_constraint 가 있는 카드. 예약시각이 파싱되지 않으면 현재 순서(위치)를 고정한다.
    pinned: bool = False
    # 예약 시각 "HH:MM" (BE 가 time_constraint 에서 추출). 있으면 해당 시각 time window 로 반영.
    reserved_time: str | None = None
    # 체류 시간(분, estimated_duration_min). 예약시각 제약 계산의 service time 으로 사용.
    duration_min: int | None = None


class OptimizeOrderRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # 한 Day 안에서 순서를 최적화할 카드들 (좌표 있는 카드만 전달)
    stops: list[OptimizeStop]
    # 시작 고정 앵커(예: 숙소, 첫날 도착 항공) instance_id. None 이면 시작 자유.
    start_instance_id: str | None = None
    # 종료 고정 앵커(예: 마지막날 항공 출발) instance_id. None 이면 종료 자유.
    # 시작 앵커와 같으면 귀가 closed-tour(숙소 출발 → 숙소 복귀)로 최적화한다.
    end_instance_id: str | None = None


class OptimizeOrderResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ordered_instance_ids: list[str]
    total_duration_seconds: int
    source: RouteSource
