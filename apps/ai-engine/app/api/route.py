from fastapi import APIRouter

from app.schemas.route import (
    OptimizeOrderRequest,
    OptimizeOrderResponse,
    RouteRequest,
    RouteResponse,
)
from app.services.route_optimizer import optimize_routes
from app.services.route_order_service import optimize_order

router = APIRouter(prefix="/internal/ai", tags=["route"])


@router.post("/route", response_model=RouteResponse)
async def compute_route(req: RouteRequest) -> RouteResponse:
    # leg 단위로 폴백이 적용되므로 전체 502 없이 항상 200 + 결과 반환
    return await optimize_routes(req)


@router.post("/route/optimize-order", response_model=OptimizeOrderResponse)
async def optimize_route_order(req: OptimizeOrderRequest) -> OptimizeOrderResponse:
    # 행렬 산출 실패 시 추정 폴백이 적용되므로 항상 200 + 순서 반환
    return await optimize_order(req)
