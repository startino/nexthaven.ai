import pytest
from unittest.mock import patch, AsyncMock, MagicMock
import json

from src.models.requirement import GeneratedRequirement, UserRequirement, Budget, DateRange


def test_analyze_user_requirement_initialization():
    """Test that AnalyzeUserRequirement can be initialized."""
    with patch('src.interfaces.llm.ministral_8b') as mock_llm:
        from src.lib.evaluate.analyze import AnalyzeUserRequirement
        
        analyzer = AnalyzeUserRequirement()
        assert analyzer is not None
        assert hasattr(analyzer, 'analyze_user_requirement')


@pytest.mark.asyncio
async def test_analyze_user_requirement_method():
    """Test the analyze_user_requirement method."""
    with patch('src.interfaces.llm.ministral_8b') as mock_llm:
        # Setup mock
        mock_instance = MagicMock()
        mock_llm.return_value = mock_instance
        
        # Mock the bind_tools method
        mock_chain = MagicMock()
        mock_instance.bind_tools.return_value = mock_chain
        
        # Mock the invoke method
        mock_chain.invoke.return_value = {
            "id": "GeneratedRequirement",
            "args": {
                "location": "Miami Beach",
                "budget": {
                    "min": 150,
                    "max": 300,
                    "currency": "USD"
                },
                "dates": {
                    "check_in": "2023-09-01",
                    "check_out": "2023-09-05"
                },
                "guests": 2,
                "amenities": ["pool", "wifi", "beach access"],
                "property_type": "hotel",
                "importance": {
                    "location": 5,
                    "price": 4,
                    "amenities": 3,
                    "reviews": 2
                }
            }
        }
        
        # Import here to avoid import errors
        from src.lib.evaluate.analyze import AnalyzeUserRequirement
        
        # Create analyzer and analyze user preferences
        analyzer = AnalyzeUserRequirement()
        user_requirement = UserRequirement(
            query="I want a hotel in Miami Beach for 2 people from September 1-5, 2023. My budget is $150-300 per night.",
            budget=Budget(min=150, max=300, currency="USD"),
            date_range=DateRange(check_in="2023-09-01", check_out="2023-09-05"),
            adults=2,
            children=0
        )
        
        result = await analyzer.analyze_user_requirement(user_requirement)
        
        # Verify result
        assert isinstance(result, GeneratedRequirement)
        assert result.location == "Miami Beach"
        assert result.budget.min == 150
        assert result.budget.max == 300
        assert result.budget.currency == "USD"
        assert result.dates.check_in == "2023-09-01"
        assert result.dates.check_out == "2023-09-05"
        assert result.guests == 2
        assert "pool" in result.amenities
        assert "wifi" in result.amenities
        assert result.property_type == "hotel"
        assert result.importance["location"] == 5
        assert result.importance["price"] == 4
        
        # Verify the LLM was called correctly
        mock_instance.bind_tools.assert_called_once()
        mock_chain.invoke.assert_called_once()


@pytest.mark.asyncio
async def test_analyze_user_requirement_with_error():
    """Test error handling in analyze_user_requirement method."""
    with patch('src.interfaces.llm.ministral_8b') as mock_llm:
        # Setup mock to raise an exception
        mock_instance = MagicMock()
        mock_llm.return_value = mock_instance
        
        # Mock the bind_tools method
        mock_chain = MagicMock()
        mock_instance.bind_tools.return_value = mock_chain
        
        # Mock the invoke method to raise an exception
        mock_chain.invoke = MagicMock(side_effect=Exception("API Error"))
        
        # Import here to avoid import errors
        from src.lib.evaluate.analyze import AnalyzeUserRequirement
        
        # Create analyzer
        analyzer = AnalyzeUserRequirement()
        
        # Test that exception is raised
        with pytest.raises(Exception) as excinfo:
            user_requirement = UserRequirement(
                query="I want a hotel in Miami Beach",
                budget=Budget(min=150, max=300, currency="USD"),
                date_range=DateRange(check_in="2023-09-01", check_out="2023-09-05"),
                adults=2,
                children=0
            )
            await analyzer.analyze_user_requirement(user_requirement)
        
        assert "API Error" in str(excinfo.value) 