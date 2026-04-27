from __future__ import annotations

import logging

from dotenv import load_dotenv
from fastapi import FastAPI

from app.api.parse import router as parse_router

load_dotenv()

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="TripKey AI Engine")
app.include_router(parse_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
