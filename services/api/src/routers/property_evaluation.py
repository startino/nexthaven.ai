from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import logging
import time
import asyncio

from src.models.apify import BookingApifyRequest, BookingApifyResponse
from src.models.airbnb_apify import AirbnbApifyResponse
from src.models.requirement import GeneratedRequirement, UserRequirement, Budget, DateRange
from src.models.request import PropertyQueryRequest, PropertyEvaluationRequest
# from src.lib.evaluate.agents import EvaluateAgent
from src.lib.evaluate.agents_with_vision import EvaluateAgent
from src.lib.evaluate.analyze import AnalyzeUserRequirement
from src.lib.scraper.booking_apify import BookingApifyAgent
from src.lib.scraper.airbnb_apify import AirbnbApifyAgent
from src.models.result import Result
from src.models.unified_property import UnifiedProperty
from src.lib.cache.property_cache import (
    generate_unique_id,
    store_query_status,
    get_query_status,
    store_properties,
    retrieve_properties
)

router = APIRouter(prefix="/properties")

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
    logging.info(f"/properties/query: Starting property search for query: {request.query}")
    logging.info(f"Request data: {request.model_dump_json()}")
    
    try:
        #region Generate session ID and initialize status
        # Generate a session ID
        session_id = generate_unique_id()
        logging.info(f"Generated session ID: {session_id}")
        
        # Store initial status in cache
        await store_query_status(session_id, {
            "status": "in_progress",
            "started_at": time.time(),
            "completed": False,
            "properties_count": 0,
            "message": "Starting property search"
        })
        #endregion
        
        #region Start background task
        # Start the background task without awaiting it
        task = asyncio.create_task(
            fetch_properties_background(session_id, request)
        )
        
        # Add a name to the task for debugging
        task.set_name(f"property_search_{session_id}")
        #endregion
        
        return JSONResponse(
            content={
                "status": "processing",
                "message": "Property search started",
                "session_id": session_id
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
    search to start earlier in the user flow, reducing the overall response time.
    
    Cursor Edit count: 2
    """
    logging.info(f"/properties/evaluate: Evaluating properties for session: {request.session_id}")
    
    try:
        start_time = time.time()
        
        #region Check query status and wait if needed
        # Check query status
        status = await get_query_status(request.session_id)
        
        if not status:
            logging.error(f"Session not found: {request.session_id}")
            raise HTTPException(status_code=404, detail="Session not found")
        
        # If query is still in progress, wait for it to complete (with timeout)
        if status.get("status") == "in_progress":
            logging.info(f"Query still in progress for session {request.session_id}, waiting...")
            
            # Wait for completion with timeout
            max_wait_time = 180  # 3 minutes max wait
            wait_interval = 2  # Check every 2 seconds
            total_waited = 0
            
            while status.get("status") == "in_progress" and total_waited < max_wait_time:
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
            raise HTTPException(status_code=500, detail=f"Property query failed: {error_message}")
        
        if status.get("status") != "completed":
            logging.error("Property query timed out or failed")
            raise HTTPException(status_code=408, detail="Property query timed out")
        #endregion
        
        #region Retrieve and validate properties
        # Retrieve properties and basic requirements
        all_properties, basic_req_obj = await retrieve_properties(request.session_id)
        
        # Ensure basic_req_obj is a GeneratedRequirement object
        if not isinstance(basic_req_obj, GeneratedRequirement):
            logging.error(f"Invalid requirements format: {type(basic_req_obj)}")
            raise HTTPException(status_code=500, detail="Invalid requirements format")
        
        # Ensure all_properties is a list of property objects
        if not isinstance(all_properties, list):
            logging.error(f"Invalid properties format: {type(all_properties)}")
            raise HTTPException(status_code=500, detail="Invalid properties format")
        
        logging.info(f"Retrieved {len(all_properties)} properties for evaluation")
        #endregion
        
        #region Update requirements with preferences
        # Update requirements with preferences
        user_requirement = UserRequirement(
            query=basic_req_obj.query,
            date=f"{basic_req_obj.date_range.start_date} to {basic_req_obj.date_range.end_date}",
            budget=basic_req_obj.budget,
            adults=basic_req_obj.adults,
            children=basic_req_obj.children,
            number_of_rooms=basic_req_obj.number_of_rooms,
            preferences=request.preferences
        )
        
        # Analyze with preferences included
        analyzer = AnalyzeUserRequirement()
        updated_req_obj = analyzer.analyze_user_requirement(user_requirement)
        #endregion
        
        #region Evaluate properties
        # Evaluate properties
        evaluate_agent = EvaluateAgent()
        results = await evaluate_agent.evaluate(updated_req_obj, all_properties)
        
        # Limit to requested number of results
        top_results = results[:30]
        
        # Convert UnifiedProperty objects to dictionaries for JSON response
        formatted_results = []
        for prop in top_results:
            try:
                # The prop is already a UnifiedProperty object, so we can directly use model_dump()
                formatted_results.append(prop.model_dump(exclude={"raw_data"}))
                logging.info(f"Evaluated property: {prop.name} with score: {prop.score}")
            except Exception as e:
                logging.error(f"Error formatting result: {str(e)}")
        #endregion
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        logging.info(f"Evaluation completed in {processing_time:.2f} seconds, found {len(formatted_results)} properties")
        
        return JSONResponse(
            content={
                "status": "success",
                "message": "Property evaluation completed",
                "count": len(formatted_results),
                "results": formatted_results,
                "processing_time": f"{processing_time:.2f} seconds"
            }
        )
    
    except Exception as e:
        logging.error(f"Error evaluating properties: {str(e)}")
        logging.exception("Exception details:")
        raise HTTPException(status_code=500, detail=str(e))

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
    try:
        logging.info(f"Background task: Fetching properties for session {session_id}")
        logging.info(f"Request type: {type(request)}")
        
        # Create a proper PropertyQueryRequest object if we received a dict
        if not isinstance(request, PropertyQueryRequest):
            try:
                if isinstance(request, dict):
                    logging.info(f"Converting dict to PropertyQueryRequest: {request}")
                    request_obj = PropertyQueryRequest(**request)
                else:
                    # Try to convert to dict first, then to PropertyQueryRequest
                    logging.info(f"Converting unknown type to PropertyQueryRequest: {request}")
                    request_dict = dict(request)
                    request_obj = PropertyQueryRequest(**request_dict)
                    
                logging.info(f"Successfully converted to PropertyQueryRequest: {request_obj.model_dump_json()}")
            except Exception as e:
                logging.error(f"Failed to convert request to PropertyQueryRequest: {str(e)}")
                await store_query_status(session_id, {
                    "status": "error",
                    "error": f"Invalid request format: {str(e)}",
                    "completed": False,
                    "message": f"Error: Invalid request format"
                })
                return
        else:
            request_obj = request
            
        logging.info(f"Using request object: {request_obj.model_dump_json()}")
            
        #region Create user requirement
        # Create basic user requirement without preferences
        user_requirement = UserRequirement(
            query=request_obj.query,
            date=request_obj.date,
            budget=request_obj.budget,
            adults=request_obj.adults,
            children=request_obj.children,
            number_of_rooms=request_obj.number_of_rooms,
            preferences=""  # Empty preferences
        )
        
        logging.info(f"Created user requirement: {user_requirement.model_dump_json()}")
        #endregion
        
        #region Analyze requirements
        # Analyze without preferences
        analyzer = AnalyzeUserRequirement()
        generated_req_obj_result = analyzer.analyze_user_requirement(user_requirement)
        
        # Ensure generated_req_obj is a GeneratedRequirement object
        if isinstance(generated_req_obj_result, dict):
            logging.info(f"Converting dict to GeneratedRequirement: {generated_req_obj_result}")
            generated_req_obj = GeneratedRequirement(**generated_req_obj_result)
        else:
            generated_req_obj = generated_req_obj_result
            
        logging.info(f"Using GeneratedRequirement object: {generated_req_obj.model_dump_json()}")
        
        # Update status with progress
        await store_query_status(session_id, {
            "status": "in_progress",
            "started_at": time.time(),
            "completed": False,
            "properties_count": 0,
            "message": "Analyzing requirements"
        })
        #endregion
        
        #region Query Apify
        # Query Apify
        booking_agent = BookingApifyAgent()
        airbnb_agent = AirbnbApifyAgent()
        
        booking_request = booking_agent.generate_request(generated_req_obj)
        airbnb_request = airbnb_agent.generate_request(generated_req_obj)
        
        # Update status with progress
        await store_query_status(session_id, {
            "status": "in_progress",
            "started_at": time.time(),
            "completed": False,
            "properties_count": 0,
            "message": "Querying Booking.com and Airbnb"
        })
        
        # Execute both scrapers concurrently
        booking_properties, airbnb_properties = await asyncio.gather(
            booking_agent.get_properties(booking_request),
            airbnb_agent.get_properties(airbnb_request)
        )
        
        # Combine properties from both sources
        all_properties = booking_properties + airbnb_properties
        #endregion
        
        #region Store results
        # Store properties and requirements in cache
        await store_properties(session_id, all_properties, generated_req_obj)
        
        # Update status
        await store_query_status(session_id, {
            "status": "completed",
            "completed": True,
            "completed_at": time.time(),
            "properties_count": len(all_properties),
            "message": f"Found {len(all_properties)} properties"
        })
        
        logging.info(f"Background task completed: Found {len(all_properties)} properties for session {session_id}")
        #endregion
        
    except Exception as e:
        logging.error(f"Error in background task for session {session_id}: {str(e)}")
        logging.exception("Exception details:")
        # Update status with error
        await store_query_status(session_id, {
            "status": "error",
            "error": str(e),
            "completed": False,
            "message": f"Error: {str(e)}"
        }) 