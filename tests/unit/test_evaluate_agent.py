import pytest
from unittest.mock import patch, AsyncMock, MagicMock
import json

from src.models.unified_property import UnifiedProperty
from src.models.requirement import GeneratedRequirement, Budget, DateRange


@pytest.fixture
def sample_properties():
    """Return a list of sample unified properties for testing."""
    return [
        UnifiedProperty(
            id="prop1",
            name="Beach Resort",
            description="A beautiful beachfront property",
            location="Miami Beach",
            source="booking",
            url="https://example.com/property/1",
            pricing={"total": 250.0},
            capacity={"bedrooms": 2, "beds": 3},
            features={"amenities": ["pool", "wifi", "parking"]},
            media={
                "main_image": "https://example.com/image1.jpg",
                "gallery": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
            },
            score=0,  # Default score
            reasoning="Not evaluated yet"  # Default reasoning
        ),
        UnifiedProperty(
            id="prop2",
            name="City Center Hotel",
            description="A convenient city center location",
            location="Downtown",
            source="airbnb",
            url="https://example.com/property/2",
            pricing={"total": 150.0},
            capacity={"bedrooms": 1, "beds": 1},
            features={"amenities": ["wifi", "restaurant"]},
            media={
                "main_image": "https://example.com/image3.jpg",
                "gallery": ["https://example.com/image3.jpg", "https://example.com/image4.jpg"]
            },
            score=0,  # Default score
            reasoning="Not evaluated yet"  # Default reasoning
        )
    ]


@pytest.fixture
def sample_user_request():
    """Return a sample user request for testing."""
    return GeneratedRequirement(
        reasoning="This is a sample requirement for testing purposes",
        query="Hotel in Miami Beach for 2 people",
        date_range=DateRange(start_date="2023-09-01", end_date="2023-09-05"),
        budget=Budget(min=150, max=300, currency="USD"),
        nightly_budget=Budget(min=30, max=60, currency="USD"),
        adults=2,
        children=0,
        number_of_rooms=1,
        preferences=["pool", "wifi", "beach access"]
    )


def test_evaluate_agent_initialization():
    """Test that EvaluateAgent can be initialized."""
    with patch('src.interfaces.llm.o3_mini') as mock_llm:
        with patch('src.interfaces.llm.gemini_flash_2') as mock_vision_llm:
            from src.lib.evaluate.agents_with_vision import EvaluateAgent
            
            agent = EvaluateAgent()
            assert agent is not None
            assert hasattr(agent, 'evaluate')


@pytest.mark.asyncio
async def test_evaluate(sample_properties, sample_user_request):
    """Test the evaluate method."""
    with patch('src.interfaces.llm.o3_mini') as mock_llm:
        with patch('src.interfaces.llm.gemini_flash_2') as mock_vision_llm:
            # Setup mocks
            mock_llm_instance = MagicMock()
            mock_llm.return_value = mock_llm_instance
            
            mock_vision_llm_instance = MagicMock()
            mock_vision_llm.return_value = mock_vision_llm_instance
            
            # Import here to avoid import errors
            from src.lib.evaluate.agents_with_vision import EvaluateAgent
            
            # Create agent
            agent = EvaluateAgent()
            
            # Mock the _analyze_images method
            agent._analyze_images = AsyncMock(return_value="Image analysis results")
            
            # Mock the _simplify_property method
            agent._simplify_property = MagicMock(return_value={"simplified": "property"})
            
            # Mock the _create_unified_property method
            agent._create_unified_property = MagicMock(side_effect=[
                UnifiedProperty(
                    id="prop1",
                    name="Beach Resort",
                    description="A beautiful beachfront property",
                    location="Miami Beach",
                    source="booking",
                    url="https://example.com/property/1",
                    pricing={"total": 250.0},
                    capacity={"bedrooms": 2, "beds": 3},
                    features={"amenities": ["pool", "wifi", "parking"]},
                    media={
                        "main_image": "https://example.com/image1.jpg",
                        "gallery": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
                    },
                    score=85,
                    reasoning="Great beachfront location with amenities"
                ),
                UnifiedProperty(
                    id="prop2",
                    name="City Center Hotel",
                    description="A convenient city center location",
                    location="Downtown",
                    source="airbnb",
                    url="https://example.com/property/2",
                    pricing={"total": 150.0},
                    capacity={"bedrooms": 1, "beds": 1},
                    features={"amenities": ["wifi", "restaurant"]},
                    media={
                        "main_image": "https://example.com/image3.jpg",
                        "gallery": ["https://example.com/image3.jpg", "https://example.com/image4.jpg"]
                    },
                    score=70,
                    reasoning="Good city center location but not near beach"
                )
            ])
            
            # Mock the LLM invoke method
            mock_llm_instance.invoke = AsyncMock(side_effect=[
                MagicMock(content=json.dumps({
                    "score": 85,
                    "reasoning": "Great beachfront location with amenities"
                })),
                MagicMock(content=json.dumps({
                    "score": 70,
                    "reasoning": "Good city center location but not near beach"
                }))
            ])
            
            # Call the evaluate method
            evaluated_properties = await agent.evaluate(sample_user_request, sample_properties)
            
            # Verify results
            assert len(evaluated_properties) == 2
            assert evaluated_properties[0].score == 85
            assert evaluated_properties[0].reasoning == "Great beachfront location with amenities"
            assert evaluated_properties[1].score == 70
            assert evaluated_properties[1].reasoning == "Good city center location but not near beach"


@pytest.mark.asyncio
async def test_evaluate_with_error(sample_properties, sample_user_request):
    """Test error handling in evaluate method."""
    with patch('src.interfaces.llm.o3_mini') as mock_llm:
        with patch('src.interfaces.llm.gemini_flash_2') as mock_vision_llm:
            # Setup mocks
            mock_llm_instance = MagicMock()
            mock_llm.return_value = mock_llm_instance
            
            mock_vision_llm_instance = MagicMock()
            mock_vision_llm.return_value = mock_vision_llm_instance
            
            # Mock the LLM invoke method to raise an exception
            mock_llm_instance.invoke = AsyncMock(side_effect=Exception("API Error"))
            
            # Import here to avoid import errors
            from src.lib.evaluate.agents_with_vision import EvaluateAgent
            
            # Create agent
            agent = EvaluateAgent()
            
            # Mock the _analyze_images method
            agent._analyze_images = AsyncMock(return_value="Image analysis results")
            
            # Mock the _simplify_property method
            agent._simplify_property = MagicMock(return_value={"simplified": "property"})
            
            # Call the evaluate method
            evaluated_properties = await agent.evaluate(sample_user_request, sample_properties)
            
            # Verify results - properties should be returned with default scores
            assert len(evaluated_properties) == 2
            for prop in evaluated_properties:
                assert prop.score == 0  # Default score
                assert "Error evaluating property" in prop.reasoning 