import os
import sys
import pytest
import asyncio
from typing import Dict, List, Any, AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import BaseModel

# Add src to path so tests can import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Import your FastAPI app - adjust based on actual location
from src import create_app

# =========== API Testing Fixtures ==========

@pytest.fixture
def app() -> FastAPI:
    """
    Create a FastAPI test app instance with test dependencies.
    """
    return create_app(testing=True)

@pytest.fixture
def client(app: FastAPI) -> TestClient:
    """
    Create a TestClient instance for making test requests.
    """
    return TestClient(app)

# =========== Mock Data Fixtures ==========

@pytest.fixture
def mock_property_data() -> Dict[str, Any]:
    """
    Mock property data for testing property evaluation.
    """
    return {
        "id": "mock-property-1",
        "name": "Test Luxury Villa",
        "description": "Beautiful villa with garden",
        "address": "123 Test Street, Rome, Italy",
        "price": 150.0,
        "currency": "EUR",
        "url": "https://example.com/property/123",
        "rating": 9.2,
        "stars": 4,
        "image_urls": ["https://example.com/img1.jpg", "https://example.com/img2.jpg"],
        "amenities": ["Pool", "WiFi", "Air conditioning", "Kitchen"],
        "location": {
            "lat": 41.9028,
            "lng": 12.4964
        }
    }

@pytest.fixture
def mock_requirement_data() -> Dict[str, Any]:
    """
    Mock requirement data for testing property evaluation.
    """
    return {
        "query": "Luxury villa in Rome",
        "date_range": {
            "start_date": "2024-06-01",
            "end_date": "2024-06-07"
        },
        "budget": {
            "min": 100,
            "max": 300,
            "currency": "EUR"
        },
        "adults": 2,
        "children": 0,
        "number_of_rooms": 1,
        "preferences": "I want a quiet place with a pool and good WiFi for remote work."
    }

# =========== Mock Service Fixtures ==========

@pytest.fixture
def mock_cache():
    """
    Mock cache for testing cache operations.
    """
    cache = {}
    
    async def mock_store_query_status(session_id, status):
        cache[f"status:{session_id}"] = status
        
    async def mock_get_query_status(session_id):
        return cache.get(f"status:{session_id}")
        
    async def mock_store_properties(session_id, properties, requirements):
        cache[f"properties:{session_id}"] = (properties, requirements)
        
    async def mock_retrieve_properties(session_id):
        return cache.get(f"properties:{session_id}", ([], None))
    
    with patch("src.lib.cache.property_cache.store_query_status", mock_store_query_status), \
         patch("src.lib.cache.property_cache.get_query_status", mock_get_query_status), \
         patch("src.lib.cache.property_cache.store_properties", mock_store_properties), \
         patch("src.lib.cache.property_cache.retrieve_properties", mock_retrieve_properties):
        yield

@pytest.fixture
def mock_booking_apify():
    """
    Mock Booking.com Apify client.
    """
    booking_mock = AsyncMock()
    booking_mock.get_properties.return_value = [
        {"id": "booking-1", "name": "Booking Test Hotel", "price": 200.0}
    ]
    
    with patch("src.lib.scraper.booking_apify.BookingApifyAgent") as mock:
        mock.return_value = booking_mock
        yield booking_mock

@pytest.fixture
def mock_airbnb_apify():
    """
    Mock Airbnb Apify client.
    """
    airbnb_mock = AsyncMock()
    airbnb_mock.get_properties.return_value = [
        {"id": "airbnb-1", "name": "Airbnb Test Apartment", "price": 150.0}
    ]
    
    with patch("src.lib.scraper.airbnb_apify.AirbnbApifyAgent") as mock:
        mock.return_value = airbnb_mock
        yield airbnb_mock

@pytest.fixture
def mock_evaluate_agent():
    """
    Mock property evaluation agent.
    """
    evaluate_mock = AsyncMock()
    evaluate_mock.evaluate.return_value = [
        MagicMock(score=95, name="Top Rated Property")
    ]
    
    with patch("src.lib.evaluate.agents_with_vision.EvaluateAgent") as mock:
        mock.return_value = evaluate_mock
        yield evaluate_mock

# =========== Timing and Background Task Fixtures ==========

@pytest.fixture
def mock_time():
    """
    Fixture to mock time-related functions.
    """
    with patch("time.time", return_value=1000000.0):
        yield

@pytest.fixture
def mock_asyncio_task():
    """
    Mock asyncio.create_task to test background tasks.
    """
    task_mock = MagicMock()
    task_mock.set_name = MagicMock()
    
    with patch("asyncio.create_task", return_value=task_mock) as mock:
        yield mock 