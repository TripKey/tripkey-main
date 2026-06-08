import pytest
import httpx

from app.schemas.destination_search import Destination
from app.services import destination_search as svc


@pytest.mark.asyncio
async def test_search_destinations_maps_autocomplete_response(monkeypatch):
    sample_response = {
        "suggestions": [
            {
                "placePrediction": {
                    "placeId": "ChIJ_osaka",
                    "structuredFormat": {
                        "mainText": {"text": "오사카"},
                        "secondaryText": {"text": "일본"},
                    },
                }
            },
            {
                "placePrediction": {
                    "placeId": "ChIJ_tokyo",
                    "structuredFormat": {
                        "mainText": {"text": "도쿄"},
                        "secondaryText": {"text": "일본"},
                    },
                }
            },
        ]
    }
    monkeypatch.setattr(svc, "_places_api_key", lambda: "test-key")

    async def fake_post(self, url, json, headers):
        request = httpx.Request("POST", url)
        return httpx.Response(200, json=sample_response, request=request)

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    results = await svc.search_destinations("오사")

    assert results == [
        Destination(name="오사카", country="일본", place_id="ChIJ_osaka"),
        Destination(name="도쿄", country="일본", place_id="ChIJ_tokyo"),
    ]


@pytest.mark.asyncio
async def test_search_destinations_empty_suggestions(monkeypatch):
    monkeypatch.setattr(svc, "_places_api_key", lambda: "test-key")

    async def fake_post(self, url, json, headers):
        request = httpx.Request("POST", url)
        return httpx.Response(200, json={}, request=request)

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    results = await svc.search_destinations("zzz")
    assert results == []


@pytest.mark.asyncio
async def test_search_destinations_raises_on_missing_key(monkeypatch):
    monkeypatch.setattr(svc, "_places_api_key", lambda: None)

    with pytest.raises(RuntimeError):
        await svc.search_destinations("오사")


@pytest.mark.asyncio
async def test_search_destinations_raises_on_http_error(monkeypatch):
    monkeypatch.setattr(svc, "_places_api_key", lambda: "test-key")

    async def fake_post(self, url, json, headers):
        request = httpx.Request("POST", url)
        return httpx.Response(500, json={"error": "boom"}, request=request)

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    with pytest.raises(httpx.HTTPStatusError):
        await svc.search_destinations("오사")
