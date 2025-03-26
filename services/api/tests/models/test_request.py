import pytest
from hypothesis import given, strategies as st
from pydantic import ValidationError
from pydantic_core import ValidationError as PydanticCoreValidationError

from src.models.request import PropertyQueryRequest, PropertyEvaluationRequest

# ========== Unit Tests for Request Models ==========

@pytest.mark.unit
class TestPropertyQueryRequest:
    """
    Test suite for PropertyQueryRequest model.
    
    Uses a mix of traditional unit tests and property-based testing to ensure
    the model handles all possible valid and invalid inputs correctly.
    """
    
    def test_valid_request(self):
        """Test that a valid request is accepted."""
        # Arrange
        data = {
            "query": "Luxury villa in Rome",
            "date": "2024-06-01 to 2024-06-07",
            "budget": {"min": 100, "max": 300, "currency": "EUR"},
            "adults": 2,
            "children": 0,
            "number_of_rooms": 1
        }
        
        # Act
        request = PropertyQueryRequest(**data)
        
        # Assert
        assert request.query == data["query"]
        assert request.date == data["date"]
        assert request.budget.min == data["budget"]["min"]
        assert request.budget.max == data["budget"]["max"]
        assert request.budget.currency == data["budget"]["currency"]
        assert request.adults == data["adults"]
        assert request.children == data["children"]
        assert request.number_of_rooms == data["number_of_rooms"]
    
    def test_missing_required_fields(self):
        """Test that the model rejects requests with missing required fields."""
        # Arrange
        data = {
            # Missing "query"
            "date": "2024-06-01 to 2024-06-07",
            "budget": {"min": 100, "max": 300, "currency": "EUR"},
            "adults": 2,
            "children": 0,
            "number_of_rooms": 1
        }
        
        # Act & Assert
        with pytest.raises((ValidationError, PydanticCoreValidationError)) as exc_info:
            PropertyQueryRequest(**data)
        
        # Assert that the error references the missing "query" field
        assert "query" in str(exc_info.value)
    
    def test_invalid_values(self):
        """Test that the model rejects invalid field values."""
        # Arrange
        data = {
            "query": "Luxury villa in Rome",
            "date": "2024-06-01 to 2024-06-07",
            "budget": {"min": 100, "max": 300, "currency": "EUR"},
            "adults": -1,  # Invalid: negative number
            "children": 0,
            "number_of_rooms": 1
        }
        
        # Act & Assert
        with pytest.raises((ValidationError, PydanticCoreValidationError)):
            PropertyQueryRequest(**data)
    
    @given(
        query=st.text(min_size=1, max_size=200),
        min_price=st.integers(min_value=0, max_value=1000),
        max_price=st.integers(min_value=1000, max_value=10000),
        adults=st.integers(min_value=1, max_value=10),
        children=st.integers(min_value=0, max_value=5)
    )
    def test_property_query_with_various_inputs(self, query, min_price, max_price, adults, children):
        """
        Property-based test that ensures PropertyQueryRequest works with a wide
        range of valid inputs.
        """
        # Arrange data with hypothesis-generated values
        data = {
            "query": query,
            "date": "2024-06-01 to 2024-06-07",  # Fixed date for simplicity
            "budget": {"min": min_price, "max": max_price, "currency": "EUR"},
            "adults": adults,
            "children": children,
            "number_of_rooms": 1
        }
        
        # Act
        request = PropertyQueryRequest(**data)
        
        # Assert
        assert request.query == query
        assert request.budget.min == min_price
        assert request.budget.max == max_price
        assert request.adults == adults
        assert request.children == children


@pytest.mark.unit
class TestPropertyEvaluationRequest:
    """
    Test suite for PropertyEvaluationRequest model.
    """
    
    def test_valid_evaluation_request(self):
        """Test that a valid evaluation request is accepted."""
        # Arrange
        data = {
            "session_id": "test-session-123",
            "preferences": "I want a quiet place with a pool and good WiFi."
        }
        
        # Act
        request = PropertyEvaluationRequest(**data)
        
        # Assert
        assert request.session_id == data["session_id"]
        assert request.preferences == data["preferences"]
    
    def test_missing_session_id(self):
        """Test that the model rejects requests with missing session_id."""
        # Arrange
        data = {
            # Missing "session_id"
            "preferences": "I want a quiet place with a pool."
        }
        
        # Act & Assert
        with pytest.raises((ValidationError, PydanticCoreValidationError)) as exc_info:
            PropertyEvaluationRequest(**data)
        
        # Assert that the error references the missing "session_id" field
        assert "session_id" in str(exc_info.value)
    
    @given(
        session_id=st.text(min_size=1, max_size=50),
        preferences=st.text(min_size=0, max_size=500)
    )
    def test_evaluation_request_with_various_inputs(self, session_id, preferences):
        """
        Property-based test that ensures PropertyEvaluationRequest works with
        a wide range of valid inputs.
        """
        # Arrange data with hypothesis-generated values
        data = {
            "session_id": session_id,
            "preferences": preferences
        }
        
        # Act
        request = PropertyEvaluationRequest(**data)
        
        # Assert
        assert request.session_id == session_id
        assert request.preferences == preferences 