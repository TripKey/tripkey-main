from __future__ import annotations

import logging

from dotenv import load_dotenv
from fastapi import FastAPI

from app.api.non_blocking_enrichment import router as non_blocking_enrichment_router
from app.api.parse import router as parse_router
from app.api.route import router as route_router

load_dotenv()

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="TripKey AI Engine")
app.include_router(parse_router)
app.include_router(non_blocking_enrichment_router)
app.include_router(route_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
