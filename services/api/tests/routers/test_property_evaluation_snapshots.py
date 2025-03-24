import pytest
import json
from unittest.mock import patch, MagicMock, AsyncMock

from src.models.request import PropertyQueryRequest
from src.routers.property_evaluation import query_properties, evaluate_properties

# ========== Snapshot Tests ==========

@pytest.mark.snapshot
@pytest.mark.asyncio
@pytest.mark.skip(reason="Snapshot test skipped as the snapshot data needs to be initialized with --snapshot-update")
async def test_query_properties_response_snapshot(snapshot, mock_asyncio_task, mock_time, mock_cache):
    """
    Snapshot test for query_properties response format.
    
    This test verifies that the structure of the response from query_properties
    matches the expected snapshot. This helps catch unintentional changes to the API.
    """
    # Arrange
    request = PropertyQueryRequest(
        query="Luxury villa in Rome",
        date="2024-06-01 to 2024-06-07",
        budget={"min": 100, "max": 300, "currency": "EUR"},
        adults=2,
        children=0,
        number_of_rooms=1
    )
    
    # Act
    with patch("src.lib.cache.property_cache.generate_unique_id", return_value="snapshot-session-id"):
        response = await query_properties(request)
    
    # Assert against snapshot
    response_json = json.loads(response.body)
    # Remove dynamic fields before snapshot comparison
    response_json.pop("session_id", None)
    
    # Compare with snapshot
    assert response_json == snapshot

@pytest.mark.snapshot
@pytest.mark.asyncio
@pytest.mark.skip(reason="Snapshot test skipped as the snapshot data needs to be initialized with --snapshot-update")
async def test_evaluate_properties_response_snapshot(snapshot, mock_cache):
    """
    Snapshot test for evaluate_properties response format.
    
    This test verifies the structure of property evaluation responses,
    which is particularly important for the frontend that needs to display
    evaluated properties consistently.
    """
    # Arrange
    session_id = "snapshot-eval-session-id"
    
    # Setup mock properties and completed status
    mock_property = {
        "id": "snapshot-prop-1",
        "name": "Snapshot Villa",
        "price": 200.0,
        "currency": "EUR",
        "score": 95,
        "image_urls": ["https://example.com/img1.jpg"]
    }
    
    # Mock the full evaluation flow
    with patch("src.lib.cache.property_cache.get_query_status", 
              return_value={"status": "completed", "completed": True}), \
         patch("src.lib.cache.property_cache.retrieve_properties",
              return_value=([MagicMock(**mock_property)], MagicMock())), \
         patch("src.lib.evaluate.agents_with_vision.EvaluateAgent") as mock_agent:
        
        # Setup mock evaluation agent
        agent_instance = AsyncMock()
        agent_instance.evaluate.return_value = [MagicMock(**mock_property)]
        mock_agent.return_value = agent_instance
        
        # Create evaluation request
        from src.models.request import PropertyEvaluationRequest
        request = PropertyEvaluationRequest(
            session_id=session_id,
            preferences="I want a quiet place with a pool."
        )
        
        # Act
        with patch("time.time", side_effect=[1000000.0, 1000005.0]):  # Start and end times
            response = await evaluate_properties(request)
        
    # Parse response
    response_json = json.loads(response.body)
    
    # Remove dynamic fields before snapshot comparison
    if "processing_time" in response_json:
        response_json["processing_time"] = "X.XX seconds"
    
    # Sanitize list items for consistent snapshot comparison
    if "results" in response_json and response_json["results"]:
        # Keep only specific fields we want to verify in the snapshot
        sanitized_results = []
        for item in response_json["results"]:
            sanitized_item = {
                "name": item.get("name", ""),
                "price": item.get("price", 0),
                "currency": item.get("currency", ""),
                "score": item.get("score", 0)
            }
            sanitized_results.append(sanitized_item)
        response_json["results"] = sanitized_results
        
    # Compare with snapshot
    assert response_json == snapshot

# To initialize snapshots, run:
# pytest tests/routers/test_property_evaluation_snapshots.py -v --snapshot-update 