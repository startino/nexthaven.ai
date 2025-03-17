import pytest
from pydantic import ValidationError

from src.models.request import PropertyQueryRequest, PropertyEvaluationRequest
from src.models.requirement import Budget
from src.models.unified_property import UnifiedProperty


def test_property_query_request_valid():
    """Test that a valid PropertyQueryRequest can be created."""
    request = PropertyQueryRequest(
        query="New York",
        date="2023-08-15",
        budget=Budget(min=150, max=350, currency="USD")
    )
    
    assert request.query == "New York"
    assert request.date == "2023-08-15"
    assert request.budget.min == 150
    assert request.budget.max == 350
    assert request.budget.currency == "USD"
    assert request.adults == 2  # Default value
    assert request.children == 0  # Default value
    assert request.number_of_rooms == 1  # Default value


def test_property_query_request_invalid():
    """Test that ValidationError is raised for invalid PropertyQueryRequest."""
    with pytest.raises(ValidationError):
        PropertyQueryRequest(
            query=None,  # None is not a valid string
            date="2023-08-15",
            budget=Budget(min=150, max=350, currency="USD")
        )


def test_property_evaluation_request_valid():
    """Test that a valid PropertyEvaluationRequest can be created."""
    request = PropertyEvaluationRequest(
        session_id="test-123",
        preferences="I want a quiet place with a swimming pool"
    )
    
    assert request.session_id == "test-123"
    assert request.preferences == "I want a quiet place with a swimming pool"


def test_property_evaluation_request_invalid():
    """Test that ValidationError is raised for invalid PropertyEvaluationRequest."""
    with pytest.raises(ValidationError):
        PropertyEvaluationRequest(
            session_id=None,  # None is not a valid string
            preferences="Test preferences"
        ) 