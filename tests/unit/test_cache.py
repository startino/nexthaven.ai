import pytest
import time
from unittest.mock import patch, MagicMock
import json

from src.lib.cache.property_cache import (
    generate_unique_id,
    store_query_status,
    get_query_status,
    store_properties,
    retrieve_properties,
    cache
)


def test_generate_unique_id():
    """Test that generate_unique_id returns a string."""
    session_id = generate_unique_id()
    assert isinstance(session_id, str)
    assert len(session_id) > 0


@pytest.mark.asyncio
async def test_store_and_get_query_status():
    """Test storing and retrieving query status."""
    # Mock diskcache
    with patch('src.lib.cache.property_cache.cache') as mock_cache:
        # Setup mock
        mock_cache.set = MagicMock()
        mock_cache.get = MagicMock(return_value={
            "status": "completed",
            "started_at": time.time(),
            "completed": True,
            "properties_count": 5,
            "message": "Query completed successfully"
        })
        
        # Test store_query_status
        session_id = "test-session-123"
        status = {
            "status": "completed",
            "started_at": time.time(),
            "completed": True,
            "properties_count": 5,
            "message": "Query completed successfully"
        }
        
        await store_query_status(session_id, status)
        
        # Verify cache set was called with correct arguments
        mock_cache.set.assert_called_once()
        args, _ = mock_cache.set.call_args
        assert args[0] == f"status:{session_id}"
        assert args[1] == status
        
        # Test get_query_status
        retrieved_status = await get_query_status(session_id)
        
        # Verify cache get was called with correct arguments
        mock_cache.get.assert_called_once_with(f"status:{session_id}")
        
        # Verify retrieved status matches expected
        assert retrieved_status["status"] == "completed"
        assert retrieved_status["completed"] is True
        assert retrieved_status["properties_count"] == 5


@pytest.mark.asyncio
async def test_store_and_retrieve_properties():
    """Test storing and retrieving properties."""
    # Mock diskcache
    with patch('src.lib.cache.property_cache.cache') as mock_cache:
        # Setup mock
        mock_cache.set = MagicMock()
        
        properties = [
            {
                "id": "prop1",
                "name": "Test Property 1",
                "source": "booking",
                "price": 200.0
            },
            {
                "id": "prop2",
                "name": "Test Property 2",
                "source": "airbnb",
                "price": 150.0
            }
        ]
        
        requirements = {
            "location": "New York",
            "budget": {
                "min": 100,
                "max": 300
            }
        }
        
        mock_cache.get = MagicMock(side_effect=[properties, requirements])
        
        # Test store_properties
        session_id = "test-session-123"
        
        await store_properties(session_id, properties, requirements)
        
        # Verify cache set was called with correct arguments
        assert mock_cache.set.call_count == 2
        
        # Test retrieve_properties
        retrieved_properties, retrieved_requirements = await retrieve_properties(session_id)
        
        # Verify cache get was called with correct arguments
        assert mock_cache.get.call_count == 2
        
        # Verify retrieved properties match expected
        assert len(retrieved_properties) == 2
        assert retrieved_properties[0]["id"] == "prop1"
        assert retrieved_properties[1]["source"] == "airbnb"
        
        # Verify retrieved requirements match expected
        assert retrieved_requirements["location"] == "New York"
        assert retrieved_requirements["budget"]["max"] == 300


@pytest.mark.asyncio
async def test_retrieve_properties_not_found():
    """Test retrieving properties when they don't exist."""
    from fastapi import HTTPException
    
    # Mock diskcache
    with patch('src.lib.cache.property_cache.cache') as mock_cache:
        # Setup mock to return None (no properties found)
        mock_cache.get = MagicMock(return_value=None)
        
        # Test retrieve_properties with non-existent session
        session_id = "non-existent-session"
        
        # Verify HTTPException is raised
        with pytest.raises(HTTPException) as excinfo:
            await retrieve_properties(session_id)
        
        # Verify the exception details
        assert excinfo.value.status_code == 404
        assert "not found" in excinfo.value.detail.lower() 