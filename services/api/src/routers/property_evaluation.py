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
from src.models.booking_apify import (
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
from src.lib.evaluate import EvaluateAgent
from src.lib.evaluate.analyze import AnalyzeUserRequirement
from src.lib.scraper.booking_apify import BookingApifyScraper
from src.lib.scraper.airbnb_apify import AirbnbApifyScraper
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
async def query_properties(request: PropertyQueryRequest):
    """
    Asynchronously query properties from Booking.com and Airbnb to improve user experience.

    Args:
        request: The property query request parameters

    Returns:
        JSONResponse with session_id for tracking the query

    This endpoint is called after step 2 of the form (when basic search criteria are known).
    It starts the property search process early and returns immediately with a session ID,
    allowing the frontend to proceed to the preferences step while the search runs in the background.
    This approach reduces the overall response time by parallelizing the search and preference input.

    Cursor Edit count: 4
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

        # Standard JSON response
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
async def get_query_status_endpoint(session_id: str):
    """
    Check the status of an asynchronous property query to monitor progress.

    Args:
        session_id: The unique identifier for the query session

    Returns:
        JSONResponse with the current status of the query

    This endpoint allows the frontend to check if a property query has completed,
    which is useful for providing feedback to the user about the search progress.
    It's part of the asynchronous search pattern that improves overall response time.

    Cursor Edit count: 4
    """
    logging.info(f"/properties/query/{session_id}/status: Checking query status")

    # Standard synchronous status check
    status = await get_query_status(session_id)

    if not status:
        logging.warning(f"Session not found: {session_id}")
        raise HTTPException(status_code=404, detail="Session not found")

    logging.info(f"Query status for session {session_id}: {status.get('status')}")

    return JSONResponse(content=status)


@router.post("/evaluate")
async def evaluate_properties(request: PropertyEvaluationRequest):
    """
    Evaluation API that scores properties based on user's preferences to find the best matches.

    Args:
        request: The property evaluation request with session_id and preferences

    Returns:
        EventSourceResponse with stream of property evaluation updates and final results

    This endpoint is called after step 3 of the form (when user preferences are known).
    It waits for the property search to complete if necessary, then evaluates the properties
    based on the user's preferences. This separation from the property search allows the
    search to start earlier in the user flow, reducing the overall response time for the user.

    Cursor Edit count: 5
    """
    # Track timings for different operations
    timings = {}
    overall_start_time = time.time()

    logging.info(
        f"/properties/evaluate: Evaluating properties for session: {request.session_id}"
    )

    # Helper function to safely extract image URL from different object formats
    def get_image_url(prop):
        """Extract the main image URL from a property object, handling different formats safely."""
        # If property has image attribute directly
        if hasattr(prop, "image") and prop.image:
            return prop.image

        # Handle Airbnb-style image arrays
        if hasattr(prop, "images") and prop.images:
            try:
                # Try first as a list of dictionaries
                if isinstance(prop.images[0], dict) and "imageUrl" in prop.images[0]:
                    return prop.images[0]["imageUrl"]

                # Try as object with imageUrl attribute
                if hasattr(prop.images[0], "imageUrl"):
                    return prop.images[0].imageUrl

                # Try as direct string in array
                if isinstance(prop.images[0], str):
                    return prop.images[0]
            except (IndexError, TypeError, AttributeError):
                pass

        return ""

    async def event_generator():
        try:
            # Send initial SSE event - starting
            yield ServerSentEvent(
                data=json.dumps(
                    {
                        "event": "property_evaluation",
                        "status": "started",
                        "message": "Starting property evaluation",
                        "progress": 5,
                    }
                ),
                event="property_evaluation",
            )

            # Check query status
            status_check_start = time.time()

            yield ServerSentEvent(
                data=json.dumps(
                    {
                        "event": "property_evaluation",
                        "status": "in_progress",
                        "step": "checking",
                        "message": "Checking property search status",
                        "progress": 10,
                    }
                ),
                event="property_evaluation",
            )

            status = await get_query_status(request.session_id)

            if not status:
                error_msg = f"Session not found: {request.session_id}"
                logging.error(error_msg)
                yield ServerSentEvent(
                    data=json.dumps(
                        {
                            "event": "property_evaluation",
                            "status": "error",
                            "message": error_msg,
                            "error": "session_not_found",
                        }
                    ),
                    event="property_evaluation",
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
                            "event": "property_evaluation",
                            "status": "in_progress",
                            "step": "waiting",
                            "message": "Property search still in progress, waiting for completion",
                            "progress": 15,
                        }
                    ),
                    event="property_evaluation",
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

                    # Check for session expiry
                    if not status:
                        error_msg = f"Session expired during wait: {request.session_id}"
                        logging.error(error_msg)
                        yield ServerSentEvent(
                            data=json.dumps(
                                {
                                    "event": "property_evaluation",
                                    "status": "error",
                                    "message": error_msg,
                                    "error": "session_expired",
                                }
                            ),
                            event="property_evaluation",
                        )
                        return

                logging.info(f"Waited {total_waited} seconds for query to complete")

            # Check if query completed successfully
            if status.get("status") == "error":
                error_message = status.get("error", "Unknown error")
                error_msg = f"Property query failed: {error_message}"
                logging.error(error_msg)
                yield ServerSentEvent(
                    data=json.dumps(
                        {
                            "event": "property_evaluation",
                            "status": "error",
                            "message": error_msg,
                            "error": "query_failed",
                            "query_error": error_message,
                        }
                    ),
                    event="property_evaluation",
                )
                return

            if status.get("status") != "completed":
                error_msg = "Property query timed out or failed"
                logging.error(error_msg)
                yield ServerSentEvent(
                    data=json.dumps(
                        {
                            "event": "property_evaluation",
                            "status": "error",
                            "message": error_msg,
                            "error": "query_timeout",
                        }
                    ),
                    event="property_evaluation",
                )
                return

            timings["status_check"] = time.time() - status_check_start

            # Retrieving properties
            yield ServerSentEvent(
                data=json.dumps(
                    {
                        "event": "property_evaluation",
                        "status": "in_progress",
                        "step": "retrieving_properties",
                        "message": "Retrieving properties from database cache",
                        "progress": 20,
                    }
                ),
                event="property_evaluation",
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
                            "event": "property_evaluation",
                            "status": "error",
                            "message": error_msg,
                            "error": "invalid_requirements",
                        }
                    ),
                    event="property_evaluation",
                )
                return

            # Ensure all_properties is a list of property objects
            if not isinstance(all_properties, list):
                error_msg = f"Invalid properties format: {type(all_properties)}"
                logging.error(error_msg)
                yield ServerSentEvent(
                    data=json.dumps(
                        {
                            "event": "property_evaluation",
                            "status": "error",
                            "message": error_msg,
                            "error": "invalid_properties",
                        }
                    ),
                    event="property_evaluation",
                )
                return

            timings["property_retrieval"] = time.time() - property_retrieval_start

            # Send a retrieved event with all properties
            yield ServerSentEvent(
                data=json.dumps(
                    {
                        "event": "property_evaluation",
                        "status": "retrieved",
                        "step": "properties_loaded",
                        "message": f"Successfully retrieved {len(all_properties)} properties for analysis",
                        "progress": 40,
                        "properties_count": len(all_properties),
                        "properties": [
                            # Convert to UnifiedProperty-like structure based on property type
                            {
                                "id": getattr(prop, "id", None)
                                or getattr(prop, "property_id", f"prop-{i}"),
                                "name": getattr(prop, "name", None)
                                or getattr(prop, "title", "Unnamed Property"),
                                "source": (
                                    "Airbnb"
                                    if hasattr(prop, "title")
                                    else "Booking.com"
                                ),
                                "url": getattr(prop, "url", ""),
                                "description": getattr(prop, "description", ""),
                                "location": (
                                    f"{getattr(getattr(prop, 'address', None), 'full', '')}"
                                    if hasattr(prop, "address")
                                    else ""
                                ),
                                "pricing": {
                                    "total": (
                                        getattr(
                                            getattr(prop, "price", None), "price", 0
                                        )
                                        if hasattr(prop, "price")
                                        and isinstance(prop.price, object)
                                        else (
                                            prop.price if hasattr(prop, "price") else 0
                                        )
                                    )
                                },
                                "media": {
                                    "main_image": get_image_url(prop),
                                    "gallery": [],
                                },
                            }
                            for i, prop in enumerate(all_properties)
                        ],
                    }
                ),
                event="property_evaluation",
            )

            # Update requirements with preferences
            yield ServerSentEvent(
                data=json.dumps(
                    {
                        "event": "property_evaluation",
                        "status": "in_progress",
                        "step": "preparing_analysis",
                        "message": "Preparing user preferences for property analysis",
                        "progress": 35,
                        "progress": 50,
                        "properties_count": len(all_properties),
                    }
                ),
                event="property_evaluation",
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

            # Evaluate properties
            yield ServerSentEvent(
                data=json.dumps(
                    {
                        "event": "property_evaluation",
                        "status": "in_progress",
                        "step": "analyzing_images",
                        "message": "Analyzing property images and features with AI",
                        "progress": 60,
                        "properties_count": len(all_properties),
                    }
                ),
                event="property_evaluation",
            )

            evaluation_start = time.time()
            evaluate_agent = EvaluateAgent()
            results = await evaluate_agent.evaluate(updated_req_obj, all_properties)
            timings["evaluation"] = time.time() - evaluation_start

            # Limit to requested number of results
            top_results = results[:30]

            # Format results
            yield ServerSentEvent(
                data=json.dumps(
                    {
                        "event": "property_evaluation",
                        "status": "in_progress",
                        "step": "ranking_properties",
                        "message": "Ranking and sorting properties based on match score",
                        "progress": 90,
                    }
                ),
                event="property_evaluation",
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

            # Send final results
            yield ServerSentEvent(
                data=json.dumps(
                    {
                        "event": "property_evaluation",
                        "status": "completed",
                        "message": "Property evaluation and image analysis completed",
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
                event="property_evaluation",
            )

        except asyncio.CancelledError:
            # Client disconnected
            logging.info(
                f"Client disconnected from evaluation SSE for session {request.session_id}"
            )
            yield ServerSentEvent(
                data=json.dumps(
                    {
                        "event": "property_evaluation",
                        "status": "cancelled",
                        "message": "Client disconnected",
                    }
                ),
                event="property_evaluation",
            )

        except Exception as e:
            logging.error(f"Error in evaluation SSE: {str(e)}")
            logging.exception("Exception details:")
            yield ServerSentEvent(
                data=json.dumps(
                    {
                        "event": "property_evaluation",
                        "status": "error",
                        "message": f"An unexpected error occurred: {str(e)}",
                        "error": "unexpected_error",
                    }
                ),
                event="property_evaluation",
            )

    return EventSourceResponse(event_generator(), media_type="text/event-stream")


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
    async def update_status(status_data, event_type=None):
        # Set default event type
        event_type = "property_fetching"

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
                    }
                )
                return
        else:
            request_obj = request
        timings["request_processing"] = time.time() - request_processing_start

        # Send initial status update
        await update_status(
            {
                "status": "started",
                "started_at": time.time(),
                "completed": False,
                "properties_count": 0,
                "message": "Starting property search from multiple sources",
                "progress": 5,
            }
        )

        # Create user requirement
        req_creation_start = time.time()
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

        # Analyze requirements
        await update_status(
            {
                "status": "in_progress",
                "started_at": time.time(),
                "completed": False,
                "properties_count": 0,
                "message": "Analyzing user search criteria for property matching",
                "step": "analyzing_criteria",
                "progress": 20,
            }
        )

        analysis_start = time.time()
        analyzer = AnalyzeUserRequirement()
        generated_req_obj_result = analyzer.analyze_user_requirement(user_requirement)

        # Ensure generated_req_obj is a GeneratedRequirement object
        if isinstance(generated_req_obj_result, dict):
            generated_req_obj = GeneratedRequirement(**generated_req_obj_result)
        else:
            generated_req_obj = generated_req_obj_result
        timings["analysis"] = time.time() - analysis_start

        # Start property fetching
        api_prep_start = time.time()
        all_properties = []
        booking_properties = []
        airbnb_properties = []

        # Update status for fetching
        await update_status(
            {
                "status": "in_progress",
                "started_at": time.time(),
                "completed": False,
                "properties_count": 0,
                "message": "Fetching property listings from Booking.com and Airbnb",
                "step": "fetching_listings",
                "progress": 20,
            }
        )

        # Fetch properties - either from dummy data or API
        if ENVIRONMENT != "production":
            logging.info("Using dummy data for non-production environment")
            logging.info(
                f"Will limit to exactly {APIFY_MAX_ITEMS} properties per source"
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

            # If no properties were loaded, create some completely dummy properties
            if not airbnb_properties and not booking_properties:
                logging.warning(
                    "No properties loaded from files, creating dummy properties"
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

            # Set API timings for dummy data
            timings["api_prep"] = time.time() - api_prep_start
            timings["api_fetch"] = 0  # No actual API fetch in non-production
        else:
            # In production, use real API data
            logging.info("Using production API data")

            # Query Apify
            booking_agent = BookingApifyScraper()
            airbnb_agent = AirbnbApifyScraper()

            # Run both request generations concurrently
            booking_request, airbnb_request = await asyncio.gather(
                asyncio.to_thread(booking_agent.generate_request, generated_req_obj),
                asyncio.to_thread(airbnb_agent.generate_request, generated_req_obj),
            )
            timings["api_prep"] = time.time() - api_prep_start

            # Execute both scrapers concurrently
            api_fetch_start = time.time()
            booking_properties, airbnb_properties = await asyncio.gather(
                booking_agent.get_properties(booking_request),
                airbnb_agent.get_properties(airbnb_request),
            )
            timings["api_fetch"] = time.time() - api_fetch_start

        # Combine all properties
        all_properties = booking_properties + airbnb_properties

        # Status update with initial properties fetched
        total_properties = len(booking_properties) + len(airbnb_properties)
        await update_status(
            {
                "status": "in_progress",
                "completed": False,
                "properties_count": total_properties,
                "message": f"Processing {total_properties} properties",
                "step": "processing",
                "progress": 60,
                "sources": {
                    "airbnb": len(airbnb_properties),
                    "booking": len(booking_properties),
                },
            }
        )

        # Process duplicates
        logging.info(
            f"Initial total: {len(all_properties)} properties ({len(booking_properties)} Booking.com, {len(airbnb_properties)} Airbnb)"
        )

        deduplication_start = time.time()
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

        # Record deduplication time
        timings["deduplication"] = time.time() - deduplication_start

        # Saving the results
        storage_start = time.time()
        await update_status(
            {
                "status": "in_progress",
                "completed": False,
                "properties_count": len(deduplicated_properties),
                "message": "Processing and removing duplicate property listings",
                "step": "deduplicating_properties",
                "progress": 90,
            }
        )

        # Store properties and requirements in cache
        await store_properties(session_id, deduplicated_properties, generated_req_obj)
        timings["storage"] = time.time() - storage_start

        # Calculate total time
        overall_time = time.time() - overall_start

        # Send final success status with complete data
        await update_status(
            {
                "status": "completed",
                "completed": True,
                "completed_at": time.time(),
                "properties_count": len(deduplicated_properties),
                "message": f"Successfully retrieved {len(deduplicated_properties)} unique properties from multiple sources",
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
                "property_stats": {
                    "original_count": len(booking_properties) + len(airbnb_properties),
                    "duplicates_removed": duplicate_count,
                    "duplicate_percentage": f"{duplicate_percentage:.1f}%",
                    "final_count": len(deduplicated_properties),
                    "sources": {
                        "airbnb": len(airbnb_properties),
                        "booking": len(booking_properties),
                    },
                },
            }
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
                "step": "error",
            }
        )
