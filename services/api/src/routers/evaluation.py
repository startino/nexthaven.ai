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