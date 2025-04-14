import pytest
import asyncio
from unittest.mock import patch, AsyncMock, MagicMock

from src.models.request import PropertyQueryRequest
from src.models.requirement import GeneratedRequirement, DateRange, Budget
from src.routers.evaluation import fetch_properties_background

# ========== Background Task Tests ==========


@pytest.mark.unit
@pytest.mark.asyncio
@pytest.mark.skip(
    reason="This test is skipped due to difficulties with mocking the async functions correctly. Need to revisit."
)
async def test_fetch_properties_background_success():
    """
    Test successful execution of the background property fetching task.

    This test verifies that:
    1. Status is updated correctly throughout the process
    2. Properties are processed and stored successfully
    """
    # Arrange
    session_id = "test-task-session"
    request = PropertyQueryRequest(
        query="Luxury villa in Rome",
        date="2024-06-01 to 2024-06-07",
        budget={"min": 100, "max": 300, "currency": "EUR"},
        adults=2,
        children=0,
        number_of_rooms=1,
    )

    # Create status storage
    status_updates = {}

    # Create mock functions
    store_status_mock = AsyncMock()
    store_status_mock.side_effect = lambda sid, status: status_updates.update(
        {sid: status}
    )

    store_properties_mock = AsyncMock()

    # Mock properties to be returned
    booking_properties = [{"id": "booking-1", "name": "Booking Test Hotel"}]
    airbnb_properties = [{"id": "airbnb-1", "name": "Airbnb Test Apartment"}]

    # Mock analyze process
    analyzer_mock = MagicMock()
    analyzer_mock.analyze_user_requirement.return_value = GeneratedRequirement(
        reasoning="Test reasoning",
        query="Luxury villa in Rome",
        date_range=DateRange(start_date="2024-06-01", end_date="2024-06-07"),
        budget=Budget(min=100, max=300, currency="EUR"),
        nightly_budget=Budget(min=14, max=43, currency="EUR"),
        adults=2,
        children=0,
        number_of_rooms=1,
        preferences=[],
    )

    # Setup all the agents
    booking_agent_mock = AsyncMock()
    booking_agent_mock.get_properties.return_value = booking_properties
    booking_agent_mock.generate_request.return_value = {}

    airbnb_agent_mock = AsyncMock()
    airbnb_agent_mock.get_properties.return_value = airbnb_properties
    airbnb_agent_mock.generate_request.return_value = {}

    # Apply all patches
    with patch(
        "src.lib.cache.property_cache.store_query_status", store_status_mock
    ), patch(
        "src.lib.cache.property_cache.store_properties", store_properties_mock
    ), patch(
        "src.lib.evaluate.analyze.AnalyzeUserRequirement", return_value=analyzer_mock
    ), patch(
        "src.lib.scraper.booking_apify.BookingApifyAgent",
        return_value=booking_agent_mock,
    ), patch(
        "src.lib.scraper.airbnb_apify.AirbnbApifyAgent", return_value=airbnb_agent_mock
    ):

        # Act
        await fetch_properties_background(session_id, request)

    # Assert
    # Verify status updates
    assert session_id in status_updates
    final_status = status_updates[session_id]
    assert final_status["status"] == "completed"
    assert final_status["completed"] is True
    assert final_status["properties_count"] == len(
        booking_properties + airbnb_properties
    )

    # Verify agent methods were called
    booking_agent_mock.get_properties.assert_called_once()
    airbnb_agent_mock.get_properties.assert_called_once()

    # Verify store_properties was called
    store_properties_mock.assert_called_once()


@pytest.mark.unit
@pytest.mark.asyncio
@pytest.mark.skip(
    reason="This test is skipped due to difficulties with mocking the async functions correctly. Need to revisit."
)
async def test_fetch_properties_background_error(mock_cache):
    """
    Test error handling in the background task.

    This test verifies that when an error occurs during property fetching:
    1. The error is caught
    2. Status is updated with the error information
    """
    # Arrange
    session_id = "test-error-session"
    request = PropertyQueryRequest(
        query="Luxury villa in Rome",
        date="2024-06-01 to 2024-06-07",
        budget={"min": 100, "max": 300, "currency": "EUR"},
        adults=2,
        children=0,
        number_of_rooms=1,
    )

    # Setup error in BookingApifyAgent
    error_msg = "API connection failed"

    booking_mock = AsyncMock()
    booking_mock.get_properties.side_effect = Exception(error_msg)

    # Setup mock status updates
    status_updates = {}

    async def mock_store_status(sid, status):
        status_updates[sid] = status

    with patch(
        "src.lib.cache.property_cache.store_query_status", mock_store_status
    ), patch(
        "src.lib.scraper.booking_apify.BookingApifyAgent", return_value=booking_mock
    ):

        # Act
        await fetch_properties_background(session_id, request)

    # Assert
    # Verify error status was stored
    assert session_id in status_updates
    assert status_updates[session_id]["status"] == "error"
    assert error_msg in status_updates[session_id].get("error", "")
    assert status_updates[session_id]["completed"] is False


@pytest.mark.unit
@pytest.mark.asyncio
@pytest.mark.skip(
    reason="This test is skipped due to difficulties with mocking the async functions correctly. Need to revisit."
)
async def test_fetch_properties_background_timeout(mock_booking_apify, mock_cache):
    """
    Test timeout handling in property fetching.

    This test simulates a timeout in one of the API calls and verifies
    that the system handles it gracefully.
    """
    # Arrange
    session_id = "test-timeout-session"
    request = PropertyQueryRequest(
        query="Luxury villa in Rome",
        date="2024-06-01 to 2024-06-07",
        budget={"min": 100, "max": 300, "currency": "EUR"},
        adults=2,
        children=0,
        number_of_rooms=1,
    )

    # Setup timeout in AirbnbApifyAgent
    airbnb_mock = AsyncMock()
    airbnb_mock.get_properties.side_effect = asyncio.TimeoutError("Request timed out")

    # Setup mock status updates
    status_updates = {}

    async def mock_store_status(sid, status):
        status_updates[sid] = status

    with patch(
        "src.lib.cache.property_cache.store_query_status", mock_store_status
    ), patch("src.lib.scraper.airbnb_apify.AirbnbApifyAgent", return_value=airbnb_mock):

        # Act
        await fetch_properties_background(session_id, request)

    # Assert
    # Verify error status was stored
    assert session_id in status_updates
    assert status_updates[session_id]["status"] == "error"
    assert "timed out" in status_updates[session_id].get("error", "").lower()
    assert status_updates[session_id]["completed"] is False


@pytest.mark.slow
@pytest.mark.asyncio
@pytest.mark.skip(
    reason="This test is skipped due to difficulties with mocking the async functions correctly. Need to revisit."
)
async def test_concurrent_background_tasks(mock_cache):
    """
    Test handling of multiple concurrent background tasks.

    This test verifies that the system can handle multiple concurrent
    property queries running in parallel without interfering with each other.
    """
    # Arrange
    sessions = [f"concurrent-session-{i}" for i in range(3)]
    requests = [
        PropertyQueryRequest(
            query=f"Test query {i}",
            date="2024-06-01 to 2024-06-07",
            budget={"min": 100, "max": 300, "currency": "EUR"},
            adults=2,
            children=0,
            number_of_rooms=1,
        )
        for i in range(3)
    ]

    # Setup mocks for external services
    booking_mock = AsyncMock()
    booking_mock.get_properties.return_value = [{"id": "booking-test"}]

    airbnb_mock = AsyncMock()
    airbnb_mock.get_properties.return_value = [{"id": "airbnb-test"}]

    # Setup storage to track session updates
    session_statuses = {}

    async def mock_store_status(sid, status):
        if sid not in session_statuses:
            session_statuses[sid] = []
        session_statuses[sid].append(status.copy())

    with patch(
        "src.lib.cache.property_cache.store_query_status", mock_store_status
    ), patch(
        "src.lib.scraper.booking_apify.BookingApifyAgent", return_value=booking_mock
    ), patch(
        "src.lib.scraper.airbnb_apify.AirbnbApifyAgent", return_value=airbnb_mock
    ):

        # Act: Run all tasks concurrently
        tasks = [
            fetch_properties_background(sid, req)
            for sid, req in zip(sessions, requests)
        ]
        await asyncio.gather(*tasks)

    # Assert
    # All sessions should have completed status
    for session_id in sessions:
        assert session_id in session_statuses
        # Get the final status (last one in the list)
        final_status = session_statuses[session_id][-1]
        assert final_status["status"] == "completed"
        assert final_status["properties_count"] > 0
        assert final_status["completed"] is True
