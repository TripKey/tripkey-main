from fastapi import APIRouter

from app.schemas.route import RouteRequest, RouteResponse
from app.services.route_optimizer import optimize_routes

router = APIRouter(prefix="/internal/ai", tags=["route"])


@router.post("/route", response_model=RouteResponse)
async def compute_route(req: RouteRequest) -> RouteResponse:
    # leg 단위로 폴백이 적용되므로 전체 502 없이 항상 200 + 결과 반환
    return await optimize_routes(req)
