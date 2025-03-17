import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src import create_app


def test_app_creation():
    """Test that the FastAPI app is created correctly."""
    app = create_app()
    
    # Check that the app is a FastAPI instance
    assert isinstance(app, FastAPI)
    
    # Check that the app has middleware
    assert len(app.user_middleware) > 0
    
    # Check that the CORS middleware is set up
    assert any("CORSMiddleware" in str(middleware.cls) for middleware in app.user_middleware)


def test_app_root_redirect(client):
    """Test that the root endpoint redirects to docs."""
    response = client.get("/", follow_redirects=False)
    
    # Check that the response is a redirect
    assert response.status_code == 307
    assert response.headers["location"] == "/docs"


def test_process_time_header(client):
    """Test that the process time header is added to responses."""
    response = client.get("/docs")
    
    # Check that the X-Process-Time header exists
    assert "X-Process-Time" in response.headers
    
    # Check that the value is a float (time in seconds)
    process_time = float(response.headers["X-Process-Time"])
    assert process_time >= 0  # Changed from > 0 to >= 0 to account for very fast responses 