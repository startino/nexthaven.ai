from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import logging
import time
import asyncio
import os
import json
from pathlib import Path

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

    Cursor Edit count: 2
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

        # region Start background task
        # Start the background task without awaiting it
        task = asyncio.create_task(fetch_properties_background(session_id, request))

        # Add a name to the task for debugging
        task.set_name(f"property_search_{session_id}")
        # endregion

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

    Cursor Edit count: 2
    """
    logging.info(f"/properties/query/{session_id}/status: Checking query status")

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
        JSONResponse with evaluated properties sorted by score

    This endpoint is called after step 3 of the form (when user preferences are known).
    It waits for the property search to complete if necessary, then evaluates the properties
    based on the user's preferences. This separation from the property search allows the
    search to start earlier in the user flow, reducing the overall response time for the user.

    Cursor Edit count: 2
    """
    # Track timings for different operations
    timings = {}
    overall_start_time = time.time()

    logging.info(
        f"/properties/evaluate: Evaluating properties for session: {request.session_id}"
    )

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


async def fetch_properties_background(session_id: str, request: PropertyQueryRequest):
    """
    Background task to fetch properties from Apify to separate property fetching from evaluation.

    Args:
        session_id: Unique identifier for the query session
        request: The property query request parameters

    This function runs asynchronously in the background after a query request is received.
    It fetches properties from both Booking.com and Airbnb, then stores them in the cache.
    This separation allows the property search to start earlier in the user flow,
    reducing the overall response time for the user.

    Cursor Edit count: 3
    """
    # Track timings for different operations
    timings = {}
    overall_start = time.time()

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
                await store_query_status(
                    session_id,
                    {
                        "status": "error",
                        "error": f"Invalid request format: {str(e)}",
                        "completed": False,
                        "message": f"Error: Invalid request format",
                    },
                )
                return
        else:
            request_obj = request
        timings["request_processing"] = time.time() - request_processing_start

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

        # Update status with progress
        await store_query_status(
            session_id,
            {
                "status": "in_progress",
                "started_at": time.time(),
                "completed": False,
                "properties_count": 0,
                "message": "Analyzing requirements",
            },
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
                                    id=prop.get("id", f"airbnb-dummy-{i}"),
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

            # Run both request generations concurrently
            booking_request, airbnb_request = await asyncio.gather(
                asyncio.to_thread(booking_agent.generate_request, generated_req_obj),
                asyncio.to_thread(airbnb_agent.generate_request, generated_req_obj),
            )
            timings["api_prep"] = time.time() - api_prep_start

            # Update status with progress
            await store_query_status(
                session_id,
                {
                    "status": "in_progress",
                    "started_at": time.time(),
                    "completed": False,
                    "properties_count": 0,
                    "message": "Querying Booking.com and Airbnb",
                },
            )

            # Execute both scrapers concurrently
            api_fetch_start = time.time()
            booking_properties, airbnb_properties = await asyncio.gather(
                booking_agent.get_properties(booking_request),
                airbnb_agent.get_properties(airbnb_request),
            )
            timings["api_fetch"] = time.time() - api_fetch_start

            # Log final counts
            logging.info(
                f"Final total: {len(booking_properties)} Booking.com, {len(airbnb_properties)} Airbnb"
            )

        # Combine properties from both sources - no need to limit again since we limited at source
        all_properties = booking_properties + airbnb_properties
        logging.info(
            f"Final total: {len(all_properties)} properties ({len(booking_properties)} Booking.com, {len(airbnb_properties)} Airbnb)"
        )
        # endregion

        # region Store results
        storage_start = time.time()
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
            f"6. Property Storage: {timings['storage']:.2f}s\n"
            f"------------------------------------------\n"
            f"OUTCOME: {len(all_properties)} total properties fetched and stored\n"
            f"==========================================\n"
        )

        # Update status
        await store_query_status(
            session_id,
            {
                "status": "completed",
                "completed": True,
                "completed_at": time.time(),
                "properties_count": len(all_properties),
                "message": f"Found {len(all_properties)} properties",
                "performance_metrics": {
                    "request_processing_time": f"{timings['request_processing']:.2f}s",
                    "requirement_creation_time": f"{timings['req_creation']:.2f}s",
                    "analysis_time": f"{timings['analysis']:.2f}s",
                    "api_preparation_time": f"{timings['api_prep']:.2f}s",
                    "api_fetch_time": f"{timings['api_fetch']:.2f}s",
                    "storage_time": f"{timings['storage']:.2f}s",
                    "total_time": f"{overall_time:.2f}s",
                },
            },
        )

    except Exception as e:
        logging.error(f"Error in background task for session {session_id}: {str(e)}")
        logging.exception("Exception details:")
        # Update status with error
        await store_query_status(
            session_id,
            {
                "status": "error",
                "error": str(e),
                "completed": False,
                "message": f"Error: {str(e)}",
            },
        )
