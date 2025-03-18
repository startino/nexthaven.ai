import pytest
from fastapi.testclient import TestClient


def test_invalid_query_request(client):
    """Test that the /properties/query endpoint handles invalid requests."""
    # Make a request with invalid data
    response = client.post("/properties/query", json={
        # Missing required fields
        "date": "2023-09-01"
    })
    
    # Check that the response is a validation error
    assert response.status_code == 422
    assert "validation error" in response.text.lower()


def test_invalid_evaluation_request(client):
    """Test that the /properties/evaluate endpoint handles invalid requests."""
    # Make a request with invalid data
    response = client.post("/properties/evaluate", json={
        # Missing required fields
        "preferences": "I want a quiet place"
    })
    
    # Check that the response is a validation error
    assert response.status_code == 422
    assert "validation error" in response.text.lower()


def test_nonexistent_session_id(client):
    """Test that the /properties/query/{session_id}/status endpoint handles nonexistent session IDs."""
    # Make a request with a nonexistent session ID
    response = client.get("/properties/query/nonexistent-session-id/status")
    
    # Check that the response is a 404 error
    assert response.status_code == 404
    assert "not found" in response.text.lower()


def test_invalid_route(client):
    """Test that the API handles requests to nonexistent routes."""
    # Make a request to a nonexistent route
    response = client.get("/nonexistent-route")
    
    # Check that the response is a 404 error
    assert response.status_code == 404
    assert "not found" in response.text.lower()


def test_method_not_allowed(client):
    """Test that the API handles requests with invalid HTTP methods."""
    # Make a GET request to a POST-only endpoint
    response = client.get("/properties/query")
    
    # Check that the response is a 405 error (Method Not Allowed)
    assert response.status_code == 405
    assert "method not allowed" in response.text.lower() 