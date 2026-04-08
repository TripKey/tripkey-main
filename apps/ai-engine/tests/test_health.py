import os

from fastapi.testclient import TestClient


os.environ.setdefault("GEMINI_API_KEY", "test-api-key")
os.environ.setdefault("GOOGLE_MAPS_API_KEY", "test-maps-key")

from app.main import app


client = TestClient(app)


def test_health_returns_ok() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
