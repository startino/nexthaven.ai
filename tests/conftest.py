import os
import sys
import pytest
from fastapi.testclient import TestClient

# Add the project root directory to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src import create_app


@pytest.fixture
def app():
    """Create a FastAPI app for testing."""
    return create_app()


@pytest.fixture
def client(app):
    """Create a test client for the app."""
    return TestClient(app)


@pytest.fixture
def sample_property_query_request():
    """Return a sample property query request."""
    from src.models.request import PropertyQueryRequest
    from src.models.requirement import Budget
    
    return PropertyQueryRequest(
        query="London",
        date="2023-07-15",
        budget=Budget(min=100, max=300, currency="USD"),
        adults=2,
        children=0,
        number_of_rooms=1
    )


@pytest.fixture
def sample_property_evaluation_request():
    """Return a sample property evaluation request."""
    from src.models.request import PropertyEvaluationRequest
    
    return PropertyEvaluationRequest(
        session_id="test-session-id",
        preferences="I want a quiet place near the beach with a nice view."
    ) 