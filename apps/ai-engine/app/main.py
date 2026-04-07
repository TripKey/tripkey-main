from fastapi import FastAPI
from pydantic import BaseModel
import uuid


class ParseRequest(BaseModel):
    text: str
    destination: str | None = None
    travel_days: int | None = None


app = FastAPI(title="TripKey AI Engine")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/internal/ai/parse")
def parse_user_input(
    req: ParseRequest,
) -> dict:  ## 이후 pydantic BaseModel로 응답 스키마 정의 필요
    return {
        "cards": [
            {
                "place_id": "mock-place-id-1",
                "instance_id": str(uuid.uuid4()),
                "name": "도톤보리",
                "category": "관광",
                "classification": "confirmed",
                "estimated_duration_min": 90,
                "coordinates": {"lat": 34.6687, "lng": 135.5013},
                "status": "success",
            }
        ],
        "context_summary": "오사카 중심 여행",
    }
