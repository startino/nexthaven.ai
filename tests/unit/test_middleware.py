import pytest
from unittest.mock import AsyncMock, MagicMock
import time

from fastapi import FastAPI, Request, Response
from fastapi.testclient import TestClient


def test_process_time_middleware():
    """Test that the process time middleware adds the X-Process-Time header."""
    # Create a FastAPI app with the middleware
    app = FastAPI()
    
    @app.middleware("http")
    async def add_process_time_header(request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time 
        response.headers["X-Process-Time"] = str(process_time)
        return response
    
    @app.get("/test")
    async def test_endpoint():
        return {"message": "Test endpoint"}
    
    # Create a test client
    client = TestClient(app)
    
    # Make a request
    response = client.get("/test")
    
    # Check that the response has the X-Process-Time header
    assert "X-Process-Time" in response.headers
    assert float(response.headers["X-Process-Time"]) >= 0


def test_cors_middleware():
    """Test that the CORS middleware allows cross-origin requests."""
    from fastapi.middleware.cors import CORSMiddleware
    
    # Create a FastAPI app with the CORS middleware
    app = FastAPI()
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    @app.get("/test")
    async def test_endpoint():
        return {"message": "Test endpoint"}
    
    # Create a test client
    client = TestClient(app)
    
    # Make a request with an Origin header
    response = client.get("/test", headers={"Origin": "http://example.com"})
    
    # Check that the response has the Access-Control-Allow-Origin header
    assert "Access-Control-Allow-Origin" in response.headers
    assert response.headers["Access-Control-Allow-Origin"] == "*"
    
    # Make a preflight request
    response = client.options(
        "/test",
        headers={
            "Origin": "http://example.com",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Content-Type"
        }
    )
    
    # Check that the response has the appropriate CORS headers
    assert response.status_code == 200
    assert "Access-Control-Allow-Origin" in response.headers
    assert "Access-Control-Allow-Methods" in response.headers
    assert "Access-Control-Allow-Headers" in response.headers 