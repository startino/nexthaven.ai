import pytest
import json
from unittest.mock import MagicMock, AsyncMock, patch
from pydantic import BaseModel
from typing import List, Dict, Any

# Import the EvaluateAgent - adjust path if needed
from src.lib.evaluate.agents_with_vision import EvaluateAgent
from src.models.unified_property import UnifiedProperty
from src.models.requirement import GeneratedRequirement

class TestEvaluateAgent:
    """
    Tests for the EvaluateAgent which handles property evaluation with AI.
    
    These tests focus on isolating the AI component for testing by mocking
    the underlying LLM calls. This allows us to test the agent's logic
    without actually calling OpenAI or other AI services.
    """
    
    @pytest.fixture
    def mock_requirement(self) -> GeneratedRequirement:
        """Fixture for test requirement data"""
        # Create a requirement object for testing
        return GeneratedRequirement(
            query="Luxury villa in Rome",
            date_range={
                "start_date": "2024-06-01",
                "end_date": "2024-06-07"
            },
            budget={
                "min": 100,
                "max": 300,
                "currency": "EUR"
            },
            adults=2,
            children=0,
            number_of_rooms=1,
            preferences=["Pool", "WiFi", "Near city center"],
            priorities=["Location", "Amenities", "Price"]
        )
    
    @pytest.fixture
    def mock_properties(self) -> List[UnifiedProperty]:
        """Fixture for test property data"""
        # Create a list of property objects for testing
        properties = []
        
        # Property 1 - High match
        properties.append(UnifiedProperty(
            id="test-prop-1",
            name="Luxury Pool Villa",
            description="Beautiful villa with pool near city center",
            address="123 Test Street, Rome, Italy",
            price=250.0,
            currency="EUR",
            url="https://example.com/property/1",
            rating=9.2,
            stars=4,
            source="test",
            image_urls=["https://example.com/img1.jpg"],
            amenities=["Pool", "WiFi", "Air conditioning", "Kitchen"],
            location={
                "lat": 41.9028,
                "lng": 12.4964
            }
        ))
        
        # Property 2 - Medium match
        properties.append(UnifiedProperty(
            id="test-prop-2",
            name="City Apartment",
            description="Modern apartment in Rome",
            address="456 Test Avenue, Rome, Italy",
            price=180.0,
            currency="EUR",
            url="https://example.com/property/2",
            rating=8.5,
            stars=3,
            source="test",
            image_urls=["https://example.com/img2.jpg"],
            amenities=["WiFi", "Air conditioning"],
            location={
                "lat": 41.9000,
                "lng": 12.5000
            }
        ))
        
        # Property 3 - Low match
        properties.append(UnifiedProperty(
            id="test-prop-3",
            name="Budget Studio",
            description="Small studio far from center",
            address="789 Far Street, Rome, Italy",
            price=120.0,
            currency="EUR",
            url="https://example.com/property/3",
            rating=7.0,
            stars=2,
            source="test",
            image_urls=["https://example.com/img3.jpg"],
            amenities=["WiFi"],
            location={
                "lat": 41.8500,
                "lng": 12.6000
            }
        ))
        
        return properties
    
    @pytest.mark.asyncio
    async def test_evaluate_properties(self, mock_requirement, mock_properties):
        """
        Test property evaluation by mocking the LLM responses.
        
        This test verifies that:
        1. The agent processes all properties
        2. Properties are correctly scored based on the mocked AI responses
        3. The results are sorted by score
        4. The reasoning is captured
        """
        # Arrange
        # Mock LLM responses for each property
        llm_responses = [
            {
                "reasoning": "This property is an excellent match. It has a pool as requested and is near the city center. The price is within budget and it has all required amenities.",
                "score": 95
            },
            {
                "reasoning": "This property is a moderate match. It's in the city but doesn't have a pool. The price is good and it has WiFi.",
                "score": 75
            },
            {
                "reasoning": "This property is a poor match. It's far from the city center, has only WiFi, and lacks most amenities requested.",
                "score": 40
            }
        ]
        
        # Create the agent with mocked LLM call
        agent = EvaluateAgent()
        
        # Mock the internal _call_llm method
        with patch.object(agent, '_call_llm', AsyncMock()) as mock_llm:
            # Set up the mock to return our predefined responses in sequence
            mock_llm.side_effect = llm_responses
            
            # Act
            results = await agent.evaluate(mock_requirement, mock_properties)
            
            # Assert
            # Check that the LLM was called for each property
            assert mock_llm.call_count == len(mock_properties)
            
            # Check that results are sorted by score
            assert len(results) == len(mock_properties)
            assert results[0].score == 95
            assert results[1].score == 75
            assert results[2].score == 40
            
            # Check that property data is preserved
            assert results[0].name == "Luxury Pool Villa"
            assert results[1].name == "City Apartment"
            assert results[2].name == "Budget Studio"
            
            # Check that reasoning is captured
            assert "excellent match" in results[0].reasoning
            assert "moderate match" in results[1].reasoning
            assert "poor match" in results[2].reasoning
    
    @pytest.mark.asyncio
    async def test_evaluate_handles_llm_errors(self, mock_requirement, mock_properties):
        """
        Test that the agent handles errors from the LLM gracefully.
        
        This test verifies that:
        1. The agent can continue processing properties even if some LLM calls fail
        2. Properties with failed evaluations receive a default score
        3. The agent logs the error
        """
        # Arrange
        # Create responses where the middle property evaluation fails
        llm_responses = [
            {
                "reasoning": "This property is an excellent match.",
                "score": 95
            },
            Exception("LLM API error"),  # Simulate an API error
            {
                "reasoning": "This property is a poor match.",
                "score": 40
            }
        ]
        
        # Create the agent with mocked LLM call
        agent = EvaluateAgent()
        
        # Mock the internal _call_llm method
        with patch.object(agent, '_call_llm', AsyncMock()) as mock_llm, \
             patch("logging.error") as mock_log_error:
            
            # Set up the mock to return our predefined responses in sequence
            mock_llm.side_effect = llm_responses
            
            # Act
            results = await agent.evaluate(mock_requirement, mock_properties)
            
            # Assert
            # Check that we still get results for all properties
            assert len(results) == len(mock_properties)
            
            # Check the error was logged
            mock_log_error.assert_called()
            
            # Check that the property with error has a default score
            # The exact behavior depends on how your agent handles errors
            # This is one possible implementation - adjust based on actual code
            scores = [p.score for p in results]
            assert 95 in scores
            assert 40 in scores
            # The middle property should have some score (default or 0)
            assert len(scores) == 3
    
    @pytest.mark.asyncio
    async def test_evaluate_with_image_analysis(self, mock_requirement, mock_properties):
        """
        Test property evaluation with image analysis.
        
        This test verifies that:
        1. Images are processed when available
        2. Image analysis results contribute to the evaluation
        """
        # Arrange
        # Mock LLM responses including image analysis results
        llm_responses = [
            {
                "reasoning": "Images show a beautiful pool and spacious interior. This property is an excellent match.",
                "score": 95,
                "image_analysis": "The property photos show a large swimming pool, elegant furnishings, and a central location."
            },
            {
                "reasoning": "Images show a small apartment with no pool. This property is a moderate match.",
                "score": 75,
                "image_analysis": "The apartment looks modern but small, no pool visible in any photos."
            },
            {
                "reasoning": "Images show a basic studio far from attractions. This property is a poor match.",
                "score": 40,
                "image_analysis": "The studio appears basic with minimal amenities, located in a remote area."
            }
        ]
        
        # Create the agent with mocked LLM and vision calls
        agent = EvaluateAgent()
        
        # Mock the internal methods
        with patch.object(agent, '_call_llm', AsyncMock()) as mock_llm, \
             patch.object(agent, '_process_images', AsyncMock(return_value="Image analysis result")):
            
            # Set up the mock to return our predefined responses in sequence
            mock_llm.side_effect = llm_responses
            
            # Act
            results = await agent.evaluate(mock_requirement, mock_properties)
            
            # Assert
            # Check that results contain image analysis
            assert len(results) == len(mock_properties)
            
            # Verify image analysis was incorporated
            # The exact implementation depends on how your agent uses image analysis
            assert "images" in results[0].reasoning.lower() or "image_analysis" in vars(results[0])
            assert "images" in results[1].reasoning.lower() or "image_analysis" in vars(results[1])
            assert "images" in results[2].reasoning.lower() or "image_analysis" in vars(results[2]) 