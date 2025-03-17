import pytest
from unittest.mock import patch, AsyncMock
import json


@pytest.mark.asyncio
async def test_query_properties_endpoint(client, sample_property_query_request):
    """Test the /properties/query endpoint."""
    
    # Mock the background task to avoid actual API calls during testing
    with patch('src.routers.property_evaluation.asyncio.create_task') as mock_create_task:
        # Convert the request model to a dictionary
        request_data = sample_property_query_request.model_dump()
        
        # Make the request to the endpoint
        response = client.post("/properties/query", json=request_data)
        
        # Check that the response is successful
        assert response.status_code == 200
        
        # Check that the response contains a session_id
        assert "session_id" in response.json()
        
        # Check that the background task was created
        mock_create_task.assert_called_once()


@pytest.mark.asyncio
async def test_get_query_status_endpoint(client):
    """Test the /properties/query/{session_id}/status endpoint."""
    
    # Mock the get_query_status function
    with patch('src.routers.property_evaluation.get_query_status', new_callable=AsyncMock) as mock_get_status:
        # Set up the mock to return a status
        mock_get_status.return_value = {
            "status": "completed",
            "started_at": 1615000000.0,
            "completed": True,
            "properties_count": 10,
            "message": "Property search completed"
        }
        
        # Make the request to the endpoint
        response = client.get("/properties/query/test-session-id/status")
        
        # Check that the response is successful
        assert response.status_code == 200
        
        # Check that the response contains the expected status
        status = response.json()
        assert status["status"] == "completed"
        assert status["completed"] is True
        assert status["properties_count"] == 10
        
        # Check that the mock was called with the correct session ID
        mock_get_status.assert_called_once_with("test-session-id")


@pytest.mark.asyncio
async def test_evaluate_properties_endpoint(client, sample_property_evaluation_request):
    """Test the /properties/evaluate endpoint."""
    
    # Mock the retrieve_properties function
    with patch('src.routers.property_evaluation.retrieve_properties', new_callable=AsyncMock) as mock_retrieve:
        # Mock the EvaluateAgent
        with patch('src.routers.property_evaluation.EvaluateAgent') as mock_agent:
            # Set up the mock to return sample properties
            mock_retrieve.return_value = [
                {
                    "id": "prop1",
                    "name": "Beach Resort",
                    "price": 200.0,
                    "currency": "USD",
                    "location": "Miami Beach",
                    "source": "booking",
                    "url": "https://example.com/property/1",
                    "rating": 4.5,
                    "amenities": ["pool", "wifi"],
                    "images": ["https://example.com/image1.jpg"],
                    "description": "A nice beachfront property"
                },
                {
                    "id": "prop2",
                    "name": "City Center Hotel",
                    "price": 150.0,
                    "currency": "USD",
                    "location": "Downtown",
                    "source": "airbnb",
                    "url": "https://example.com/property/2",
                    "rating": 4.0,
                    "amenities": ["wifi", "restaurant"],
                    "images": ["https://example.com/image2.jpg"],
                    "description": "A convenient city center location"
                }
            ]
            
            # Set up the mock agent to return sample evaluations
            instance = mock_agent.return_value
            instance.evaluate_properties.return_value = [
                {
                    "id": "prop1",
                    "name": "Beach Resort",
                    "score": 85,
                    "reasoning": "Good match for beach preference"
                },
                {
                    "id": "prop2",
                    "name": "City Center Hotel",
                    "score": 70,
                    "reasoning": "Less suitable due to location"
                }
            ]
            
            # Convert the request model to a dictionary
            request_data = sample_property_evaluation_request.model_dump()
            
            # Make the request to the endpoint
            response = client.post("/properties/evaluate", json=request_data)
            
            # Check that the response is successful
            assert response.status_code == 200
            
            # Check that the response contains the expected properties with scores
            results = response.json()
            assert len(results) == 2
            assert results[0]["id"] == "prop1"
            assert results[0]["score"] == 85
            assert results[1]["id"] == "prop2"
            assert results[1]["score"] == 70
            
            # Check that the mocks were called correctly
            mock_retrieve.assert_called_once_with(sample_property_evaluation_request.session_id)
            instance.evaluate_properties.assert_called_once() 