from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, AsyncGenerator
import logging
import time
import asyncio
import os
import json
from pathlib import Path
from sse_starlette.sse import EventSourceResponse, ServerSentEvent

from dotenv import load_dotenv, find_dotenv
from src.models.apify import (
    BookingApifyRequest,
    BookingApifyResponse,
    Location,
    Address,
)
from src.models.airbnb_apify import AirbnbApifyResponse, Price, SubDescription
from src.models.requirement import (
    GeneratedRequirement,
    UserRequirement,
    Budget,
    DateRange,
)
from src.models.request import PropertyQueryRequest, PropertyEvaluationRequest

# from src.lib.evaluate.agents import EvaluateAgent
from src.lib.evaluate.agents_with_vision import EvaluateAgent
from src.lib.evaluate.analyze import AnalyzeUserRequirement
from src.lib.scraper.booking_apify import BookingApifyAgent
from src.lib.scraper.airbnb_apify import AirbnbApifyAgent
from src.models.result import Result
from src.models.unified_property import (
    UnifiedProperty,
    PricingModel,
    CapacityModel,
    FeaturesModel,
    MediaModel,
)
from src.lib.cache.property_cache import (
    generate_unique_id,
    store_query_status,
    get_query_status,
    store_properties,
    retrieve_properties,
)

_: bool = load_dotenv(find_dotenv())
router = APIRouter(prefix="/properties")

ENVIRONMENT = os.getenv("ENVIRONMENT")
APIFY_MAX_ITEMS = int(os.getenv("APIFY_MAX_ITEMS", 10))


@router.post("/query")
async def query_properties(request: PropertyQueryRequest, sse: bool = False):
    """
    Asynchronously query properties from Booking.com and Airbnb to improve user experience.

    Args:
        request: The property query request parameters
        sse: Whether to enable Server-Sent Events for streaming updates

    Returns:
        JSONResponse with session_id for tracking the query or EventSourceResponse if sse=True

    This endpoint is called after step 2 of the form (when basic search criteria are known).
    It starts the property search process early and returns immediately with a session ID,
    allowing the frontend to proceed to the preferences step while the search runs in the background.
    This approach reduces the overall response time by parallelizing the search and preference input.

    Cursor Edit count: 3
    """
    logging.info(
        f"/properties/query: Starting property search for query: {request.query}"
    )
    logging.info(f"Request data: {request.model_dump_json()}")

    try:
        # region Generate session ID and initialize status
        # Generate a session ID
        session_id = generate_unique_id()
        logging.info(f"Generated session ID: {session_id}")

        # Store initial status in cache
        await store_query_status(
            session_id,
            {
                "status": "in_progress",
                "started_at": time.time(),
                "completed": False,
                "properties_count": 0,
                "message": "Starting property search",
            },
        )
        # endregion

        # Create a shared event bus for this session
        status_update_events = asyncio.Queue()

        # region Start background task
        # Start the background task without awaiting it
        task = asyncio.create_task(
            fetch_properties_background(session_id, request, status_update_events)
        )

        # Add a name to the task for debugging
        task.set_name(f"property_search_{session_id}")
        # endregion

        if sse:

            async def event_generator():
                # Send initial event
                yield ServerSentEvent(
                    data=json.dumps(
                        {
                            "status": "processing",
                            "message": "Property search started",
                            "session_id": session_id,
                        }
                    ),
                    event="property_search_started",
                )

                # Stream events from the background task
                try:
                    while True:
                        try:
                            # Wait for status updates with timeout
                            event_data = await asyncio.wait_for(
                                status_update_events.get(), timeout=300
                            )
                            yield ServerSentEvent(
                                data=json.dumps(event_data),
                                event=event_data.get("event", "property_search_update"),
                            )

                            # Break the loop if search is completed or has error
                            if event_data.get("status") in ["completed", "error"]:
                                break

                        except asyncio.TimeoutError:
                            # Check if task is still running
                            if task.done():
                                # Task finished but no updates received
                                yield ServerSentEvent(
                                    data=json.dumps(
                                        {
                                            "status": "completed",
                                            "message": "Search completed with no further updates",
                                            "session_id": session_id,
                                        }
                                    ),
                                    event="property_search_timeout",
                                )
                                break
                            else:
                                # Send keepalive
                                yield ServerSentEvent(
                                    data=json.dumps({"status": "in_progress"}),
                                    event="property_search_keepalive",
                                )
                except asyncio.CancelledError:
                    # Handle client disconnect
                    logging.info(
                        f"Client disconnected from SSE stream for session {session_id}"
                    )
                    if not task.done():
                        # Don't cancel the task, let it continue in the background
                        logging.info(
                            f"Background task for session {session_id} continuing after client disconnect"
                        )
                    yield ServerSentEvent(
                        data=json.dumps({"status": "cancelled"}),
                        event="connection_closed",
                    )

            return EventSourceResponse(
                event_generator(), media_type="text/event-stream"
            )
        else:
            # Standard JSON response for non-SSE clients
            return JSONResponse(
                content={
                    "status": "processing",
                    "message": "Property search started",
                    "session_id": session_id,
                }
            )
    except Exception as e:
        logging.error(f"Error starting property query: {str(e)}")
        logging.exception("Exception details:")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/query/{session_id}/status")
async def get_query_status_endpoint(session_id: str, sse: bool = False):
    """
    Check the status of an asynchronous property query to monitor progress.

    Args:
        session_id: The unique identifier for the query session
        sse: Whether to enable Server-Sent Events for streaming updates

    Returns:
        JSONResponse with the current status of the query or EventSourceResponse if sse=True

    This endpoint allows the frontend to check if a property query has completed,
    which is useful for providing feedback to the user about the search progress.
    It's part of the asynchronous search pattern that improves overall response time.

    Cursor Edit count: 3
    """
    logging.info(f"/properties/query/{session_id}/status: Checking query status")

    if sse:

        async def status_event_generator():
            try:
                # Initial status check
                status = await get_query_status(session_id)

                if not status:
                    logging.warning(f"Session not found: {session_id}")
                    yield ServerSentEvent(
                        data=json.dumps(
                            {
                                "status": "error",
                                "message": "Session not found",
                                "error": "session_not_found",
                            }
                        ),
                        event="status_check_error",
                    )
                    return

                # Send initial status
                yield ServerSentEvent(
                    data=json.dumps(status), event="status_check_initial"
                )

                # If already completed or error, just return
                if status.get("status") in ["completed", "error"]:
                    return

                # Otherwise, keep polling until we get a completion or error
                poll_interval = 2  # seconds
                max_poll_time = 300  # 5 minutes max
                total_poll_time = 0

                while total_poll_time < max_poll_time:
                    await asyncio.sleep(poll_interval)
                    total_poll_time += poll_interval

                    # Get updated status
                    new_status = await get_query_status(session_id)

                    if not new_status:
                        yield ServerSentEvent(
                            data=json.dumps(
                                {
                                    "status": "error",
                                    "message": "Session expired during polling",
                                    "error": "session_expired",
                                }
                            ),
                            event="status_check_error",
                        )
                        return

                    # If status changed, send an update
                    if new_status != status:
                        status = new_status
                        yield ServerSentEvent(
                            data=json.dumps(status), event="status_check_update"
                        )

                    # If completed or error, break the loop
                    if status.get("status") in ["completed", "error"]:
                        break

                    # Every 30 seconds, send a keepalive event to prevent connection timeout
                    if total_poll_time % 30 == 0:
                        yield ServerSentEvent(
                            data=json.dumps(
                                {"status": status.get("status", "in_progress")}
                            ),
                            event="status_check_keepalive",
                        )

                # If we've reached the maximum polling time and still not complete
                if total_poll_time >= max_poll_time and status.get("status") not in [
                    "completed",
                    "error",
                ]:
                    yield ServerSentEvent(
                        data=json.dumps(
                            {
                                "status": "timeout",
                                "message": "Status polling timed out after 5 minutes",
                                "last_status": status,
                            }
                        ),
                        event="status_check_timeout",
                    )

            except asyncio.CancelledError:
                # Client disconnected
                logging.info(
                    f"Client disconnected from status SSE for session {session_id}"
                )
                yield ServerSentEvent(
                    data=json.dumps({"status": "cancelled"}), event="connection_closed"
                )

            except Exception as e:
                logging.error(f"Error in status SSE: {str(e)}")
                logging.exception("Exception details:")
                yield ServerSentEvent(
                    data=json.dumps(
                        {
                            "status": "error",
                            "message": f"An unexpected error occurred: {str(e)}",
                            "error": "unexpected_error",
                        }
                    ),
                    event="status_check_error",
                )

        return EventSourceResponse(
            status_event_generator(), media_type="text/event-stream"
        )
    else:
        # Standard synchronous status check
        status = await get_query_status(session_id)

        if not status:
            logging.warning(f"Session not found: {session_id}")
            raise HTTPException(status_code=404, detail="Session not found")

        logging.info(f"Query status for session {session_id}: {status.get('status')}")

        return JSONResponse(content=status)


@router.post("/evaluate")
async def evaluate_properties(request: PropertyEvaluationRequest, sse: bool = True):
    """
    Evaluation API that scores properties based on user's preferences to find the best matches.

    Args:
        request: The property evaluation request with session_id and preferences
        sse: Whether to enable Server-Sent Events for streaming updates

    Returns:
        JSONResponse with evaluated properties sorted by score or EventSourceResponse if sse=True

    This endpoint is called after step 3 of the form (when user preferences are known).
    It waits for the property search to complete if necessary, then evaluates the properties
    based on the user's preferences. This separation from the property search allows the
    search to start earlier in the user flow, reducing the overall response time for the user.

    Cursor Edit count: 3
    """
    # Track timings for different operations
    timings = {}
    overall_start_time = time.time()

    logging.info(
        f"/properties/evaluate: Evaluating properties for session: {request.session_id}"
    )

    if sse:

        async def event_generator():
            try:
                # Send initial SSE event
                yield ServerSentEvent(
                    data=json.dumps(
                        {
                            "status": "processing",
                            "message": "Starting property evaluation",
                            "session_id": request.session_id,
                            "progress": 0,
                        }
                    ),
                    event="property_evaluation_started",
                )

                # Check query status
                status_check_start = time.time()

                yield ServerSentEvent(
                    data=json.dumps(
                        {
                            "status": "in_progress",
                            "message": "Checking property search status",
                            "progress": 10,
                        }
                    ),
                    event="property_evaluation_checking_status",
                )

                status = await get_query_status(request.session_id)

                if not status:
                    error_msg = f"Session not found: {request.session_id}"
                    logging.error(error_msg)
                    yield ServerSentEvent(
                        data=json.dumps(
                            {
                                "status": "error",
                                "message": error_msg,
                                "error": "session_not_found",
                            }
                        ),
                        event="property_evaluation_error",
                    )
                    return

                # If query is still in progress, wait for it to complete (with timeout)
                if status.get("status") == "in_progress":
                    logging.info(
                        f"Query still in progress for session {request.session_id}, waiting..."
                    )

                    yield ServerSentEvent(
                        data=json.dumps(
                            {
                                "status": "in_progress",
                                "message": "Property search still in progress, waiting for completion",
                                "progress": 15,
                            }
                        ),
                        event="property_evaluation_waiting",
                    )

                    # Wait for completion with timeout
                    max_wait_time = 180  # 3 minutes max wait
                    wait_interval = 2  # Check every 2 seconds
                    total_waited = 0

                    while (
                        status.get("status") == "in_progress"
                        and total_waited < max_wait_time
                    ):
                        await asyncio.sleep(wait_interval)
                        total_waited += wait_interval
                        status = await get_query_status(request.session_id)

                        # Remove the periodic waiting updates
                        if not status:
                            error_msg = (
                                f"Session expired during wait: {request.session_id}"
                            )
                            logging.error(error_msg)
                            yield ServerSentEvent(
                                data=json.dumps(
                                    {
                                        "status": "error",
                                        "message": error_msg,
                                        "error": "session_expired",
                                    }
                                ),
                                event="property_evaluation_error",
                            )
                            return

                    logging.info(f"Waited {total_waited} seconds for query to complete")

                    yield ServerSentEvent(
                        data=json.dumps(
                            {
                                "status": "in_progress",
                                "message": f"Waited {total_waited} seconds for property search to complete",
                                "waited_seconds": total_waited,
                                "progress": 20,
                            }
                        ),
                        event="property_evaluation_waiting_complete",
                    )

                # Check if query completed successfully
                if status.get("status") == "error":
                    error_message = status.get("error", "Unknown error")
                    error_msg = f"Property query failed: {error_message}"
                    logging.error(error_msg)
                    yield ServerSentEvent(
                        data=json.dumps(
                            {
                                "status": "error",
                                "message": error_msg,
                                "error": "query_failed",
                                "query_error": error_message,
                            }
                        ),
                        event="property_evaluation_error",
                    )
                    return

                if status.get("status") != "completed":
                    error_msg = "Property query timed out or failed"
                    logging.error(error_msg)
                    yield ServerSentEvent(
                        data=json.dumps(
                            {
                                "status": "error",
                                "message": error_msg,
                                "error": "query_timeout",
                            }
                        ),
                        event="property_evaluation_error",
                    )
                    return

                timings["status_check"] = time.time() - status_check_start

                # Retrieving properties
                yield ServerSentEvent(
                    data=json.dumps(
                        {
                            "status": "in_progress",
                            "message": "Retrieving properties from cache",
                            "progress": 30,
                        }
                    ),
                    event="property_evaluation_retrieving",
                )

                property_retrieval_start = time.time()
                all_properties, basic_req_obj = await retrieve_properties(
                    request.session_id
                )

                # Ensure basic_req_obj is a GeneratedRequirement object
                if not isinstance(basic_req_obj, GeneratedRequirement):
                    error_msg = f"Invalid requirements format: {type(basic_req_obj)}"
                    logging.error(error_msg)
                    yield ServerSentEvent(
                        data=json.dumps(
                            {
                                "status": "error",
                                "message": error_msg,
                                "error": "invalid_requirements",
                            }
                        ),
                        event="property_evaluation_error",
                    )
                    return

                # Ensure all_properties is a list of property objects
                if not isinstance(all_properties, list):
                    error_msg = f"Invalid properties format: {type(all_properties)}"
                    logging.error(error_msg)
                    yield ServerSentEvent(
                        data=json.dumps(
                            {
                                "status": "error",
                                "message": error_msg,
                                "error": "invalid_properties",
                            }
                        ),
                        event="property_evaluation_error",
                    )
                    return

                timings["property_retrieval"] = time.time() - property_retrieval_start

                yield ServerSentEvent(
                    data=json.dumps(
                        {
                            "status": "in_progress",
                            "message": f"Retrieved {len(all_properties)} properties from cache",
                            "properties_count": len(all_properties),
                            "progress": 40,
                        }
                    ),
                    event="property_evaluation_properties_retrieved",
                )

                # Update requirements with preferences
                yield ServerSentEvent(
                    data=json.dumps(
                        {
                            "status": "in_progress",
                            "message": "Updating requirements with user preferences",
                            "progress": 50,
                        }
                    ),
                    event="property_evaluation_updating_requirements",
                )

                req_update_start = time.time()
                user_requirement = UserRequirement(
                    query=basic_req_obj.query,
                    date=f"{basic_req_obj.date_range.start_date} to {basic_req_obj.date_range.end_date}",
                    budget=basic_req_obj.budget,
                    adults=basic_req_obj.adults,
                    children=basic_req_obj.children,
                    number_of_rooms=basic_req_obj.number_of_rooms,
                    preferences=request.preferences,
                )

                # Analyze with preferences included
                analyzer = AnalyzeUserRequirement()
                updated_req_obj = analyzer.analyze_user_requirement(user_requirement)
                timings["req_update"] = time.time() - req_update_start

                yield ServerSentEvent(
                    data=json.dumps(
                        {
                            "status": "in_progress",
                            "message": "Updated requirements with user preferences",
                            "progress": 60,
                        }
                    ),
                    event="property_evaluation_requirements_updated",
                )

                # Evaluate properties
                yield ServerSentEvent(
                    data=json.dumps(
                        {
                            "status": "in_progress",
                            "message": f"Evaluating {len(all_properties)} properties",
                            "properties_count": len(all_properties),
                            "progress": 70,
                        }
                    ),
                    event="property_evaluation_processing",
                )

                evaluation_start = time.time()
                evaluate_agent = EvaluateAgent()
                results = await evaluate_agent.evaluate(updated_req_obj, all_properties)
                timings["evaluation"] = time.time() - evaluation_start

                yield ServerSentEvent(
                    data=json.dumps(
                        {
                            "status": "in_progress",
                            "message": f"Evaluated {len(all_properties)} properties",
                            "properties_count": len(all_properties),
                            "progress": 80,
                        }
                    ),
                    event="property_evaluation_processed",
                )

                # Limit to requested number of results
                top_results = results[:30]

                yield ServerSentEvent(
                    data=json.dumps(
                        {
                            "status": "in_progress",
                            "message": "Formatting results",
                            "progress": 90,
                        }
                    ),
                    event="property_evaluation_formatting",
                )

                # Convert UnifiedProperty objects to dictionaries for JSON response
                formatting_start = time.time()
                formatted_results = []
                for prop in top_results:
                    try:
                        # The prop is already a UnifiedProperty object, so we can directly use model_dump()
                        formatted_results.append(prop.model_dump(exclude={"raw_data"}))
                    except Exception as e:
                        logging.error(f"Error formatting result: {str(e)}")
                timings["formatting"] = time.time() - formatting_start

                # Calculate total time
                overall_time = time.time() - overall_start_time

                # Generate comprehensive performance report
                logging.info(
                    f"Property evaluation complete - Performance Report:\n"
                    f"==========================================\n"
                    f"SESSION: {request.session_id}\n"
                    f"TOTAL TIME: {overall_time:.2f} seconds\n"
                    f"------------------------------------------\n"
                    f"1. Status Check & Waiting: {timings['status_check']:.2f}s\n"
                    f"2. Property Retrieval: {timings['property_retrieval']:.2f}s\n"
                    f"   - Properties Retrieved: {len(all_properties)}\n"
                    f"3. Requirements Processing: {timings['req_update']:.2f}s\n"
                    f"4. Property Evaluation: {timings['evaluation']:.2f}s\n"
                    f"5. Result Formatting: {timings['formatting']:.2f}s\n"
                    f"------------------------------------------\n"
                    f"OUTCOME: {len(formatted_results)} top properties selected from {len(all_properties)} total properties\n"
                    f"==========================================\n"
                )

                # Send final results
                yield ServerSentEvent(
                    data=json.dumps(
                        {
                            "status": "success",
                            "message": "Property evaluation completed",
                            "count": len(formatted_results),
                            "results": formatted_results,
                            "processing_time": f"{overall_time:.2f} seconds",
                            "performance_metrics": {
                                "status_check_time": f"{timings['status_check']:.2f}s",
                                "property_retrieval_time": f"{timings['property_retrieval']:.2f}s",
                                "requirements_update_time": f"{timings['req_update']:.2f}s",
                                "evaluation_time": f"{timings['evaluation']:.2f}s",
                                "formatting_time": f"{timings['formatting']:.2f}s",
                                "total_time": f"{overall_time:.2f}s",
                            },
                            "progress": 100,
                        }
                    ),
                    event="property_evaluation_completed",
                )

            except asyncio.CancelledError:
                # Client disconnected
                logging.info(
                    f"Client disconnected from evaluation SSE for session {request.session_id}"
                )
                yield ServerSentEvent(
                    data=json.dumps({"status": "cancelled"}), event="connection_closed"
                )

            except Exception as e:
                logging.error(f"Error in evaluation SSE: {str(e)}")
                logging.exception("Exception details:")
                yield ServerSentEvent(
                    data=json.dumps(
                        {
                            "status": "error",
                            "message": f"An unexpected error occurred: {str(e)}",
                            "error": "unexpected_error",
                        }
                    ),
                    event="property_evaluation_error",
                )

        return EventSourceResponse(event_generator(), media_type="text/event-stream")

    # Standard synchronous implementation for non-SSE requests
    try:
        # region Check query status and wait if needed
        status_check_start = time.time()
        # Check query status
        status = await get_query_status(request.session_id)

        if not status:
            logging.error(f"Session not found: {request.session_id}")
            raise HTTPException(status_code=404, detail="Session not found")

        # If query is still in progress, wait for it to complete (with timeout)
        if status.get("status") == "in_progress":
            logging.info(
                f"Query still in progress for session {request.session_id}, waiting..."
            )

            # Wait for completion with timeout
            max_wait_time = 180  # 3 minutes max wait
            wait_interval = 2  # Check every 2 seconds
            total_waited = 0

            while (
                status.get("status") == "in_progress" and total_waited < max_wait_time
            ):
                await asyncio.sleep(wait_interval)
                total_waited += wait_interval
                status = await get_query_status(request.session_id)

                # Remove the periodic waiting updates
                if not status:
                    logging.error(f"Session expired during wait: {request.session_id}")
                    raise HTTPException(status_code=404, detail="Session expired")

            logging.info(f"Waited {total_waited} seconds for query to complete")

        # Check if query completed successfully
        if status.get("status") == "error":
            error_message = status.get("error", "Unknown error")
            logging.error(f"Property query failed: {error_message}")
            raise HTTPException(
                status_code=500, detail=f"Property query failed: {error_message}"
            )

        if status.get("status") != "completed":
            logging.error("Property query timed out or failed")
            raise HTTPException(status_code=408, detail="Property query timed out")

        timings["status_check"] = time.time() - status_check_start
        # endregion

        # region Retrieve and validate properties
        property_retrieval_start = time.time()

        # Retrieve properties and basic requirements from cache
        all_properties, basic_req_obj = await retrieve_properties(request.session_id)

        # Ensure basic_req_obj is a GeneratedRequirement object
        if not isinstance(basic_req_obj, GeneratedRequirement):
            logging.error(f"Invalid requirements format: {type(basic_req_obj)}")
            raise HTTPException(status_code=500, detail="Invalid requirements format")

        # Ensure all_properties is a list of property objects
        if not isinstance(all_properties, list):
            logging.error(f"Invalid properties format: {type(all_properties)}")
            raise HTTPException(status_code=500, detail="Invalid properties format")

        timings["property_retrieval"] = time.time() - property_retrieval_start
        # endregion

        # region Update requirements with preferences
        req_update_start = time.time()
        # Update requirements with preferences
        user_requirement = UserRequirement(
            query=basic_req_obj.query,
            date=f"{basic_req_obj.date_range.start_date} to {basic_req_obj.date_range.end_date}",
            budget=basic_req_obj.budget,
            adults=basic_req_obj.adults,
            children=basic_req_obj.children,
            number_of_rooms=basic_req_obj.number_of_rooms,
            preferences=request.preferences,
        )

        # Analyze with preferences included
        analyzer = AnalyzeUserRequirement()
        updated_req_obj = analyzer.analyze_user_requirement(user_requirement)
        timings["req_update"] = time.time() - req_update_start
        # endregion

        # region Evaluate properties
        evaluation_start = time.time()
        # Evaluate properties
        evaluate_agent = EvaluateAgent()
        results = await evaluate_agent.evaluate(updated_req_obj, all_properties)
        timings["evaluation"] = time.time() - evaluation_start

        # Limit to requested number of results
        top_results = results[:30]

        # Convert UnifiedProperty objects to dictionaries for JSON response
        formatting_start = time.time()
        formatted_results = []
        for prop in top_results:
            try:
                # The prop is already a UnifiedProperty object, so we can directly use model_dump()
                formatted_results.append(prop.model_dump(exclude={"raw_data"}))
            except Exception as e:
                logging.error(f"Error formatting result: {str(e)}")
        timings["formatting"] = time.time() - formatting_start
        # endregion

        # Calculate total time
        overall_time = time.time() - overall_start_time

        # Generate comprehensive performance report
        logging.info(
            f"Property evaluation complete - Performance Report:\n"
            f"==========================================\n"
            f"SESSION: {request.session_id}\n"
            f"TOTAL TIME: {overall_time:.2f} seconds\n"
            f"------------------------------------------\n"
            f"1. Status Check & Waiting: {timings['status_check']:.2f}s\n"
            f"2. Property Retrieval: {timings['property_retrieval']:.2f}s\n"
            f"   - Properties Retrieved: {len(all_properties)}\n"
            f"3. Requirements Processing: {timings['req_update']:.2f}s\n"
            f"4. Property Evaluation: {timings['evaluation']:.2f}s\n"
            f"5. Result Formatting: {timings['formatting']:.2f}s\n"
            f"------------------------------------------\n"
            f"OUTCOME: {len(formatted_results)} top properties selected from {len(all_properties)} total properties\n"
            f"==========================================\n"
        )

        return JSONResponse(
            content={
                "status": "success",
                "message": "Property evaluation completed",
                "count": len(formatted_results),
                "results": formatted_results,
                "processing_time": f"{overall_time:.2f} seconds",
                "performance_metrics": {
                    "status_check_time": f"{timings['status_check']:.2f}s",
                    "property_retrieval_time": f"{timings['property_retrieval']:.2f}s",
                    "requirements_update_time": f"{timings['req_update']:.2f}s",
                    "evaluation_time": f"{timings['evaluation']:.2f}s",
                    "formatting_time": f"{timings['formatting']:.2f}s",
                    "total_time": f"{overall_time:.2f}s",
                },
            }
        )

    except Exception as e:
        logging.error(f"Error evaluating properties (global catch): {str(e)}")
        logging.exception("Global exception details:")

        # Return a user-friendly error response
        return JSONResponse(
            content={
                "status": "error",
                "message": f"An unexpected error occurred: {str(e)}",
                "count": 0,
                "results": [],
            },
            status_code=500,
        )


def remove_duplicate_properties(properties):
    """
    Identify and remove duplicate properties from a list.

    Args:
        properties: List of property objects to deduplicate

    Returns:
        Tuple of (deduplicated_properties, duplicate_count)
    """
    if not properties or len(properties) < 2:
        return properties, 0

    # Track which indexes to keep (we'll keep the first occurrence of each duplicate)
    indexes_to_keep = set(range(len(properties)))
    processed_ids = set()

    # Helper function to safely extract values from nested objects
    def safe_get(obj, *keys, default=None):
        """Safely navigate nested dictionaries/objects and return default if path doesn't exist"""
        current = obj
        for key in keys:
            if isinstance(current, dict):
                current = current.get(key, None)
            else:
                try:
                    current = getattr(current, key, None)
                except:
                    return default
            if current is None:
                return default
        return current

    # First pass: mark duplicates for removal
    for i, prop in enumerate(properties):
        prop_id = safe_get(prop, "id") or safe_get(prop, "property_id")

        # Skip if already processed
        if prop_id in processed_ids:
            continue

        # For each unprocessed property, find its duplicates
        for j in range(i + 1, len(properties)):
            other_prop = properties[j]

            # Skip if already marked for removal
            if j not in indexes_to_keep:
                continue

            other_id = safe_get(other_prop, "id") or safe_get(other_prop, "property_id")

            # Check for identity based on various criteria
            is_identical = False

            # 1. Check by ID
            if prop_id and other_id and prop_id == other_id:
                is_identical = True

            # 2. Check by URL
            if not is_identical:
                prop_url = safe_get(prop, "url")
                other_url = safe_get(other_prop, "url")
                if prop_url and other_url and prop_url == other_url:
                    is_identical = True

            # 3. Check by exact location and name
            if not is_identical:
                prop_lat = safe_get(prop, "location", "lat") or safe_get(
                    prop, "coordinates", "lat"
                )
                prop_lng = safe_get(prop, "location", "lng") or safe_get(
                    prop, "coordinates", "lng"
                )
                other_lat = safe_get(other_prop, "location", "lat") or safe_get(
                    other_prop, "coordinates", "lat"
                )
                other_lng = safe_get(other_prop, "location", "lng") or safe_get(
                    other_prop, "coordinates", "lng"
                )

                prop_name = safe_get(prop, "name") or safe_get(prop, "title")
                other_name = safe_get(other_prop, "name") or safe_get(
                    other_prop, "title"
                )

                if (
                    prop_lat
                    and prop_lng
                    and other_lat
                    and other_lng
                    and prop_lat == other_lat
                    and prop_lng == other_lng
                    and prop_name
                    and other_name
                    and prop_name == other_name
                ):
                    is_identical = True

            # 4. Check by address and similar name
            if not is_identical:
                prop_address = safe_get(prop, "address", "full")
                other_address = safe_get(other_prop, "address", "full")

                if (
                    prop_address
                    and other_address
                    and prop_address == other_address
                    and prop_name
                    and other_name
                ):
                    # Check if names are very similar
                    if (
                        prop_name.lower() in other_name.lower()
                        or other_name.lower() in prop_name.lower()
                    ):
                        is_identical = True

            # If identical, mark for removal and track processed IDs
            if is_identical:
                indexes_to_keep.remove(j)
                if other_id:
                    processed_ids.add(other_id)

        # Mark this property as processed
        if prop_id:
            processed_ids.add(prop_id)

    # Create new list with only properties to keep
    deduplicated_properties = [
        prop for i, prop in enumerate(properties) if i in indexes_to_keep
    ]
    duplicate_count = len(properties) - len(deduplicated_properties)

    return deduplicated_properties, duplicate_count


async def fetch_properties_background(
    session_id: str,
    request: PropertyQueryRequest,
    status_update_events: asyncio.Queue = None,
):
    """
    Background task to fetch properties from Apify to separate property fetching from evaluation.

    Args:
        session_id: Unique identifier for the query session
        request: The property query request parameters
        status_update_events: Optional queue to send status updates for SSE

    This function runs asynchronously in the background after a query request is received.
    It fetches properties from both Booking.com and Airbnb, then stores them in the cache.
    This separation allows the property search to start earlier in the user flow,
    reducing the overall response time for the user.

    Cursor Edit count: 4
    """
    # Track timings for different operations
    timings = {}
    overall_start = time.time()

    # Helper function to send status updates via SSE and store in cache
    async def update_status(status_data, event_type="property_search_update"):
        # Add event type to the status data
        status_data["event"] = event_type

        # Store in cache
        await store_query_status(session_id, status_data)

        # Send to SSE if available
        if status_update_events is not None:
            await status_update_events.put(status_data)

    try:
        logging.info(f"Background task: Fetching properties for session {session_id}")

        # Create a proper PropertyQueryRequest object if we received a dict
        request_processing_start = time.time()
        if not isinstance(request, PropertyQueryRequest):
            try:
                if isinstance(request, dict):
                    request_obj = PropertyQueryRequest(**request)
                else:
                    # Try to convert to dict first, then to PropertyQueryRequest
                    request_dict = dict(request)
                    request_obj = PropertyQueryRequest(**request_dict)
            except Exception as e:
                logging.error(
                    f"Failed to convert request to PropertyQueryRequest: {str(e)}"
                )
                await update_status(
                    {
                        "status": "error",
                        "error": f"Invalid request format: {str(e)}",
                        "completed": False,
                        "message": f"Error: Invalid request format",
                    },
                    event_type="property_search_error",
                )
                return
        else:
            request_obj = request
        timings["request_processing"] = time.time() - request_processing_start

        # Send status update after request processing
        await update_status(
            {
                "status": "in_progress",
                "started_at": time.time(),
                "completed": False,
                "properties_count": 0,
                "message": "Request processed, creating user requirements",
                "step": "request_processing",
                "progress": 10,
            },
            event_type="property_search_request_processed",
        )

        # region Create user requirement
        req_creation_start = time.time()
        # Create basic user requirement without preferences
        user_requirement = UserRequirement(
            query=request_obj.query,
            date=request_obj.date,
            budget=request_obj.budget,
            adults=request_obj.adults,
            children=request_obj.children,
            number_of_rooms=request_obj.number_of_rooms,
            preferences="",  # Empty preferences
        )
        timings["req_creation"] = time.time() - req_creation_start

        # Send status update after requirement creation
        await update_status(
            {
                "status": "in_progress",
                "started_at": time.time(),
                "completed": False,
                "properties_count": 0,
                "message": "User requirements created, analyzing search criteria",
                "step": "req_creation",
                "progress": 20,
            },
            event_type="property_search_requirements_created",
        )
        # endregion

        # region Analyze requirements
        analysis_start = time.time()
        # Analyze without preferences
        analyzer = AnalyzeUserRequirement()
        generated_req_obj_result = analyzer.analyze_user_requirement(user_requirement)

        # Ensure generated_req_obj is a GeneratedRequirement object
        if isinstance(generated_req_obj_result, dict):
            generated_req_obj = GeneratedRequirement(**generated_req_obj_result)
        else:
            generated_req_obj = generated_req_obj_result
        timings["analysis"] = time.time() - analysis_start

        # Send update for requirements analysis completed
        await update_status(
            {
                "status": "in_progress",
                "started_at": time.time(),
                "completed": False,
                "properties_count": 0,
                "message": "Analyzing requirements complete, preparing to fetch properties",
                "step": "analysis",
                "progress": 30,
            },
            event_type="property_search_requirements_analyzed",
        )
        # endregion

        # region Fetch Properties
        api_prep_start = time.time()
        all_properties = []
        booking_properties = []
        airbnb_properties = []

        # In non-production, use dummy data
        if ENVIRONMENT != "production":
            logging.info("Using dummy data for non-production environment")
            logging.info(
                f"Will limit to exactly {APIFY_MAX_ITEMS} properties per source"
            )

            # Update status - starting to load dummy data
            await update_status(
                {
                    "status": "in_progress",
                    "started_at": time.time(),
                    "completed": False,
                    "properties_count": 0,
                    "message": "Loading dummy property data for development environment",
                    "step": "fetch_prep",
                    "progress": 40,
                },
                event_type="property_search_data_loading",
            )

            # Load Airbnb dummy data
            airbnb_path = Path("airbnb.json")
            if airbnb_path.exists():
                try:
                    with open(airbnb_path, "r") as f:
                        airbnb_data = json.load(f)
                        # Take first APIFY_MAX_ITEMS properties and convert to AirbnbApifyResponse objects
                        for prop in airbnb_data[:APIFY_MAX_ITEMS]:
                            try:
                                # Create AirbnbApifyResponse object
                                airbnb_prop = AirbnbApifyResponse(
                                    id=prop.get(
                                        "id", f"airbnb-dummy-{len(airbnb_properties)}"
                                    ),
                                    url=prop.get("url", ""),
                                    title=prop.get("title", "Dummy Airbnb Property"),
                                    description=prop.get("description", ""),
                                    subDescription=SubDescription(
                                        text=prop.get(
                                            "subDescription",
                                            "A lovely property in a great location",
                                        ),
                                        language="en",
                                    ),
                                    price=Price(
                                        price=prop.get("price", {}).get("price", 0),
                                        currency=prop.get("price", {}).get(
                                            "currency", "USD"
                                        ),
                                    ),
                                    coordinates=prop.get("coordinates", {}),
                                    images=[{"imageUrl": prop.get("thumbnail", "")}],
                                    rating=prop.get("rating", 0),
                                    reviewsCount=prop.get("reviewsCount", 0),
                                    amenities=prop.get("amenities", []),
                                    host={
                                        "id": f"host-dummy-{len(airbnb_properties)}",
                                        "name": "Dummy Host",
                                        "isSuperhost": False,
                                        "responseRate": 100,
                                        "responseTime": "within an hour",
                                        "languages": ["English"],
                                        "memberSince": "2020-01-01",
                                        "description": "A friendly host who loves to help guests",
                                        "verifications": ["email", "phone"],
                                    },
                                    raw_data=prop,
                                )
                                airbnb_properties.append(airbnb_prop)
                            except Exception as e:
                                logging.error(
                                    f"Error creating Airbnb property: {str(e)}"
                                )
                                continue
                except Exception as e:
                    logging.error(f"Error loading Airbnb dummy data: {str(e)}")

                # Update for Airbnb data loaded
                await update_status(
                    {
                        "status": "in_progress",
                        "started_at": time.time(),
                        "completed": False,
                        "properties_count": len(airbnb_properties),
                        "message": f"Loaded {len(airbnb_properties)} Airbnb properties",
                        "step": "airbnb_data_loaded",
                        "progress": 50,
                    },
                    event_type="property_search_airbnb_loaded",
                )

            # Load Booking.com dummy data
            booking_path = Path("booking.com.json")
            if booking_path.exists():
                try:
                    with open(booking_path, "r") as f:
                        booking_data = json.load(f)
                        # Take first APIFY_MAX_ITEMS properties and convert to BookingApifyResponse objects
                        for prop in booking_data[:APIFY_MAX_ITEMS]:
                            try:
                                # Create BookingApifyResponse object
                                booking_prop = BookingApifyResponse(
                                    url=prop.get("url", ""),
                                    name=prop.get("name", "Dummy Booking.com Property"),
                                    type=prop.get("type", "Hotel"),
                                    description=prop.get("description", ""),
                                    price=prop.get("price", 0),
                                    checkIn=prop.get("checkIn", ""),
                                    checkOut=prop.get("checkOut", ""),
                                    location=Location(
                                        lat=prop.get("location", {}).get("lat", 0),
                                        lng=prop.get("location", {}).get("lng", 0),
                                    ),
                                    address=Address(
                                        full=prop.get("address", {}).get("full", ""),
                                        postalCode=prop.get("address", {}).get(
                                            "postalCode", ""
                                        ),
                                        street=prop.get("address", {}).get(
                                            "street", ""
                                        ),
                                        country=prop.get("address", {}).get(
                                            "country", ""
                                        ),
                                        region=prop.get("address", {}).get(
                                            "region", ""
                                        ),
                                    ),
                                    image=prop.get("image", ""),
                                    gallery=prop.get("images", []),
                                    rooms=[],  # Empty rooms for dummy data
                                    categoryReviews=[],  # Empty reviews for dummy data
                                    facilities=[],  # Empty facilities for dummy data
                                )
                                booking_properties.append(booking_prop)
                            except Exception as e:
                                logging.error(
                                    f"Error creating Booking.com property: {str(e)}"
                                )
                                continue
                except Exception as e:
                    logging.error(f"Error loading Booking.com dummy data: {str(e)}")

                # Update for Booking data loaded
                await update_status(
                    {
                        "status": "in_progress",
                        "started_at": time.time(),
                        "completed": False,
                        "properties_count": len(airbnb_properties)
                        + len(booking_properties),
                        "message": f"Loaded {len(booking_properties)} Booking.com properties",
                        "step": "booking_data_loaded",
                        "progress": 60,
                    },
                    event_type="property_search_booking_loaded",
                )

            # If no properties were loaded, create some completely dummy properties
            if not airbnb_properties and not booking_properties:
                logging.warning(
                    "No properties loaded from files, creating dummy properties"
                )

                # Update status - creating dummy properties
                await update_status(
                    {
                        "status": "in_progress",
                        "started_at": time.time(),
                        "completed": False,
                        "properties_count": 0,
                        "message": "No property files found, creating dummy properties",
                        "step": "creating_dummy_data",
                        "progress": 50,
                    },
                    event_type="property_search_data_loading",
                )

                # Create dummy properties for both Airbnb and Booking.com - exactly APIFY_MAX_ITEMS each
                for i in range(APIFY_MAX_ITEMS):
                    # Create dummy Airbnb property
                    airbnb_properties.append(
                        AirbnbApifyResponse(
                            id=f"airbnb-dummy-{i}",
                            url=f"https://example.com/airbnb/{i}",
                            title=f"Airbnb Dummy Property {i}",
                            description="This is a dummy Airbnb property for testing purposes.",
                            subDescription=SubDescription(
                                text="A lovely property in a great location",
                                language="en",
                            ),
                            price=Price(price=100 + (i * 20), currency="USD"),
                            coordinates={"lat": 51.5074, "lng": -0.1278},
                            images=[
                                {"imageUrl": "https://example.com/airbnb_image.jpg"}
                            ],
                            rating=4.5,
                            reviewsCount=100,
                            amenities=["WiFi", "Kitchen"],
                            host={
                                "id": f"host-dummy-{i}",
                                "name": "Dummy Host",
                                "isSuperhost": False,
                                "responseRate": 100,
                                "responseTime": "within an hour",
                                "languages": ["English"],
                                "memberSince": "2020-01-01",
                                "description": "A friendly host who loves to help guests",
                                "verifications": ["email", "phone"],
                            },
                            raw_data=None,
                        )
                    )

                    # Create dummy Booking.com property
                    booking_properties.append(
                        BookingApifyResponse(
                            url=f"https://example.com/booking/{i}",
                            name=f"Booking.com Dummy Property {i}",
                            type="Hotel",
                            description="This is a dummy Booking.com property for testing purposes.",
                            price=120 + (i * 25),
                            checkIn="2025-02-28",
                            checkOut="2025-03-13",
                            location=Location(lat=51.5074, lng=-0.1278),
                            address=Address(
                                full="123 Test St, London, UK",
                                postalCode="SW1A 1AA",
                                street="123 Test St",
                                country="UK",
                                region="London",
                            ),
                            image="https://example.com/booking_image.jpg",
                            gallery=["https://example.com/booking_image1.jpg"],
                            rooms=[],
                            categoryReviews=[],
                            facilities=[],
                        )
                    )

                # Update status - dummy properties created
                await update_status(
                    {
                        "status": "in_progress",
                        "started_at": time.time(),
                        "completed": False,
                        "properties_count": len(airbnb_properties)
                        + len(booking_properties),
                        "message": f"Created {len(airbnb_properties)} Airbnb and {len(booking_properties)} Booking.com dummy properties",
                        "step": "dummy_data_created",
                        "progress": 60,
                    },
                    event_type="property_search_data_loaded",
                )

            # Log final counts
            logging.info(
                f"Final property counts - Airbnb: {len(airbnb_properties)}, Booking: {len(booking_properties)}"
            )

            timings["api_prep"] = time.time() - api_prep_start
            timings["api_fetch"] = 0  # No actual API fetch in non-production

        else:
            # In production, use real API data
            logging.info("Using production API data")

            # Query Apify
            booking_agent = BookingApifyAgent()
            airbnb_agent = AirbnbApifyAgent()

            # Update status - preparing API requests
            await update_status(
                {
                    "status": "in_progress",
                    "started_at": time.time(),
                    "completed": False,
                    "properties_count": 0,
                    "message": "Preparing requests to property data providers",
                    "step": "api_prep",
                    "progress": 40,
                },
                event_type="property_search_api_preparing",
            )

            # Run both request generations concurrently
            booking_request, airbnb_request = await asyncio.gather(
                asyncio.to_thread(booking_agent.generate_request, generated_req_obj),
                asyncio.to_thread(airbnb_agent.generate_request, generated_req_obj),
            )
            timings["api_prep"] = time.time() - api_prep_start

            # Update status - fetching from APIs
            await update_status(
                {
                    "status": "in_progress",
                    "started_at": time.time(),
                    "completed": False,
                    "properties_count": 0,
                    "message": "Fetching properties from Booking.com and Airbnb",
                    "step": "api_fetch",
                    "progress": 50,
                },
                event_type="property_search_api_fetching",
            )

            # Execute both scrapers concurrently
            api_fetch_start = time.time()
            booking_properties, airbnb_properties = await asyncio.gather(
                booking_agent.get_properties(booking_request),
                airbnb_agent.get_properties(airbnb_request),
            )
            timings["api_fetch"] = time.time() - api_fetch_start

            # Update status - fetched properties from APIs
            await update_status(
                {
                    "status": "in_progress",
                    "started_at": time.time(),
                    "completed": False,
                    "properties_count": len(booking_properties)
                    + len(airbnb_properties),
                    "message": f"Fetched {len(booking_properties)} Booking.com and {len(airbnb_properties)} Airbnb properties",
                    "step": "api_fetch_complete",
                    "progress": 60,
                },
                event_type="property_search_api_fetched",
            )

            # Log final counts
            logging.info(
                f"Final total: {len(booking_properties)} Booking.com, {len(airbnb_properties)} Airbnb"
            )

        # Combine properties from both sources - no need to limit again since we limited at source
        all_properties = booking_properties + airbnb_properties
        logging.info(
            f"Initial total: {len(all_properties)} properties ({len(booking_properties)} Booking.com, {len(airbnb_properties)} Airbnb)"
        )

        # Remove duplicate properties
        deduplication_start = time.time()

        # Update status - starting deduplication
        await update_status(
            {
                "status": "in_progress",
                "started_at": time.time(),
                "completed": False,
                "properties_count": len(all_properties),
                "message": "Removing duplicate properties",
                "step": "deduplication_start",
                "progress": 70,
            },
            event_type="property_search_deduplication_started",
        )

        deduplicated_properties, duplicate_count = remove_duplicate_properties(
            all_properties
        )

        # Calculate duplicate percentage
        duplicate_percentage = (
            (duplicate_count / len(all_properties)) * 100 if all_properties else 0
        )

        # Log duplicate removal results
        logging.info(
            f"Deduplication: Found {duplicate_count} duplicates out of {len(all_properties)} properties ({duplicate_percentage:.1f}%)"
        )
        logging.info(
            f"Final total after deduplication: {len(deduplicated_properties)} unique properties"
        )

        # Update status - deduplication complete
        await update_status(
            {
                "status": "in_progress",
                "started_at": time.time(),
                "completed": False,
                "properties_count": len(deduplicated_properties),
                "message": f"Removed {duplicate_count} duplicate properties ({duplicate_percentage:.1f}%)",
                "step": "deduplication_complete",
                "progress": 80,
                "duplicate_info": {
                    "original_count": len(all_properties),
                    "duplicates_removed": duplicate_count,
                    "duplicate_percentage": f"{duplicate_percentage:.1f}%",
                    "final_count": len(deduplicated_properties),
                },
            },
            event_type="property_search_deduplication_completed",
        )

        # Use deduplicated properties
        all_properties = deduplicated_properties

        # Record deduplication time
        timings["deduplication"] = time.time() - deduplication_start
        # endregion

        # region Store results
        storage_start = time.time()

        # Update status - storing properties
        await update_status(
            {
                "status": "in_progress",
                "started_at": time.time(),
                "completed": False,
                "properties_count": len(all_properties),
                "message": "Storing properties in cache",
                "step": "storage_start",
                "progress": 90,
            },
            event_type="property_search_storage_started",
        )

        # Store properties and requirements in cache
        await store_properties(session_id, all_properties, generated_req_obj)
        timings["storage"] = time.time() - storage_start
        # endregion

        # Calculate total time
        overall_time = time.time() - overall_start

        # Generate comprehensive performance report
        logging.info(
            f"Property fetching complete - Performance Report:\n"
            f"==========================================\n"
            f"SESSION: {session_id}\n"
            f"TOTAL TIME: {overall_time:.2f} seconds\n"
            f"------------------------------------------\n"
            f"1. Request Processing: {timings['request_processing']:.2f}s\n"
            f"2. Requirement Creation: {timings['req_creation']:.2f}s\n"
            f"3. Requirement Analysis: {timings['analysis']:.2f}s\n"
            f"4. API Preparation: {timings['api_prep']:.2f}s\n"
            f"5. Property Fetching: {timings['api_fetch']:.2f}s\n"
            f"6. Deduplication: {timings['deduplication']:.2f}s\n"
            f"   - Removed {duplicate_count} duplicates ({duplicate_percentage:.1f}%)\n"
            f"7. Property Storage: {timings['storage']:.2f}s\n"
            f"------------------------------------------\n"
            f"OUTCOME: {len(all_properties)} unique properties fetched and stored\n"
            f"==========================================\n"
        )

        # Send final status update
        await update_status(
            {
                "status": "completed",
                "completed": True,
                "completed_at": time.time(),
                "properties_count": len(all_properties),
                "message": f"Found {len(all_properties)} unique properties (removed {duplicate_count} duplicates)",
                "step": "completed",
                "progress": 100,
                "performance_metrics": {
                    "request_processing_time": f"{timings['request_processing']:.2f}s",
                    "requirement_creation_time": f"{timings['req_creation']:.2f}s",
                    "analysis_time": f"{timings['analysis']:.2f}s",
                    "api_preparation_time": f"{timings['api_prep']:.2f}s",
                    "api_fetch_time": f"{timings['api_fetch']:.2f}s",
                    "deduplication_time": f"{timings['deduplication']:.2f}s",
                    "storage_time": f"{timings['storage']:.2f}s",
                    "total_time": f"{overall_time:.2f}s",
                },
                "duplicate_info": {
                    "original_count": len(booking_properties) + len(airbnb_properties),
                    "duplicates_removed": duplicate_count,
                    "duplicate_percentage": f"{duplicate_percentage:.1f}%",
                    "final_count": len(all_properties),
                },
            },
            event_type="property_search_completed",
        )

    except Exception as e:
        logging.error(f"Error in background task for session {session_id}: {str(e)}")
        logging.exception("Exception details:")

        # Send error status update
        await update_status(
            {
                "status": "error",
                "error": str(e),
                "completed": False,
                "message": f"Error: {str(e)}",
            },
            event_type="property_search_error",
        )
