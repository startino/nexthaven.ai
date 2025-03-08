from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from typing import AsyncGenerator, List, Optional, Dict, Any
import json
import logging
import asyncio
import time

from src.models.apify import BookingApifyRequest, BookingApifyResponse
from src.models.airbnb_apify import AirbnbApifyResponse, AirbnbApifyRequest
from src.models.requirement import GeneratedRequirement, UserRequirement, Budget, DateRange
from src.lib.evaluate.agents_with_vision import EvaluateAgent
from src.lib.evaluate.analyze import AnalyzeUserRequirement
from src.lib.scraper.booking_apify import BookingApifyAgent
from src.lib.scraper.airbnb_apify import AirbnbApifyAgent
from src.models.unified_property import UnifiedProperty

router = APIRouter(prefix="/properties")

class PropertySearchRequest(BaseModel):
    query: str
    date: str
    budget: Budget
    adults: int = 2
    children: int = 0
    number_of_rooms: int = 1
    # property_type: str = "Hotels"
    preferences: str = ""
    max_results: int = 6

async def property_evaluation_generator(
    user_request: UserRequirement,
    max_results: int = 6
) -> AsyncGenerator[bytes, None]:
    """
    Process property search and evaluation, yielding results as they become available
    """
    try:
        # Step 1: Analyze user requirements
        yield json.dumps({
            "status": "processing",
            "stage": "analyzing_requirements",
            "message": "Analyzing your requirements..."
        }).encode("utf-8")
        
        analyzer = AnalyzeUserRequirement()
        generated_requirements = analyzer.analyze_user_requirement(user_request)
        
        # Ensure generated_requirements is a dictionary before unpacking
        if isinstance(generated_requirements, dict):
            generated_req_obj = GeneratedRequirement(**generated_requirements)
        else:
            # If it's already a GeneratedRequirement object, use it directly
            generated_req_obj = generated_requirements
        
        yield json.dumps({
            "status": "processing",
            "stage": "requirements_analyzed",
            "message": "Requirements analyzed successfully"
        }).encode("utf-8")
        
        # Step 2: Search for properties
        yield json.dumps({
            "status": "processing",
            "stage": "searching_properties",
            "message": "Searching for properties that match your criteria..."
        }).encode("utf-8")
        
        # Get properties from both Booking.com and Airbnb
        booking_agent = BookingApifyAgent()
        booking_request = booking_agent.generate_request(generated_req_obj)
        booking_properties = booking_agent.get_properties(booking_request)
        
        airbnb_agent = AirbnbApifyAgent()
        airbnb_request = airbnb_agent.generate_request(generated_req_obj)
        airbnb_properties = airbnb_agent.get_properties(airbnb_request)
        
        # Combine properties from both sources
        all_properties = booking_properties + airbnb_properties
        
        yield json.dumps({
            "status": "processing",
            "stage": "properties_found",
            "message": f"Found {len(all_properties)} properties matching your criteria",
            "count": len(all_properties)
        }).encode("utf-8")
        
        # Step 3: Evaluate properties
        yield json.dumps({
            "status": "processing",
            "stage": "evaluating_properties",
            "message": "Evaluating properties based on your preferences..."
        }).encode("utf-8")
        
        # Use the EvaluateAgent with vision
        evaluate_agent = EvaluateAgent()
        
        # Start evaluation
        evaluation_task = asyncio.create_task(
            evaluate_agent.evaluate(
                generated_req_obj,
                all_properties
            )
        )
        
        # Stream progress updates while waiting for evaluation
        progress_count = 0
        while not evaluation_task.done():
            progress_count += 1
            if progress_count <= 10:  # Limit progress messages
                yield json.dumps({
                    "status": "processing",
                    "stage": "evaluation_in_progress",
                    "message": f"Analyzing property details and matching to your preferences..."
                }).encode("utf-8")
            await asyncio.sleep(2)  # Wait before checking again
        
        # Get evaluation results
        evaluated_properties = await evaluation_task
        
        # Limit to requested number of results
        top_properties = evaluated_properties[:max_results]
        
        # Step 4: Return results
        yield json.dumps({
            "status": "completed",
            "message": "Property evaluation completed",
            "count": len(top_properties)
        }).encode("utf-8")
        
        # Stream each property result individually
        for prop in top_properties:
            # Convert UnifiedProperty to dict, excluding raw_data
            property_dict = prop.model_dump(exclude={"raw_data"})
            yield (json.dumps(property_dict) + "\n").encode("utf-8")
            
    except Exception as e:
        logging.error(f"Error in property evaluation: {str(e)}")
        yield json.dumps({
            "status": "error",
            "message": f"An error occurred: {str(e)}"
        }).encode("utf-8")

@router.post("/search")
async def search_properties(request: PropertySearchRequest):
    """
    Search and evaluate properties based on user requirements.
    Returns a streaming response with real-time updates of the search and evaluation process.
    """
    logging.info(f"/properties/search: Starting property search for '{request.query}'")
    
    try:
        # Convert request to UserRequirement
        user_requirement = UserRequirement(
            query=request.query,
            date=request.date,
            budget=request.budget,
            adults=request.adults,
            children=request.children,
            number_of_rooms=request.number_of_rooms,
            # property_type=request.property_type,
            preferences=request.preferences
        )
        
        return StreamingResponse(
            property_evaluation_generator(user_requirement, request.max_results),
            media_type="application/x-ndjson",
            headers={
                "X-Accel-Buffering": "no",
                "Cache-Control": "no-cache"
            }
        )
    
    except Exception as e:
        logging.error(f"Failed to initialize property search: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/evaluate-vision")
async def evaluate_properties_vision(request: PropertySearchRequest):
    """
    Evaluate properties with vision analysis
    """
    try:
        # Create complete user requirement
        user_requirement = UserRequirement(
            query=request.query,
            date=request.date,
            budget=request.budget,
            adults=request.adults,
            children=request.children,
            number_of_rooms=request.number_of_rooms,
            preferences=request.preferences
        )
        
        # Analyze with preferences included
        analyzer = AnalyzeUserRequirement()
        generated_requirements = analyzer.analyze_user_requirement(user_requirement)
        
        # Ensure generated_requirements is a dictionary before unpacking
        if isinstance(generated_requirements, dict):
            generated_req_obj = GeneratedRequirement(**generated_requirements)
        else:
            # If it's already a GeneratedRequirement object, use it directly
            generated_req_obj = generated_requirements
        
        # Get properties from both Booking.com and Airbnb
        booking_agent = BookingApifyAgent()
        booking_request = booking_agent.generate_request(generated_req_obj)
        booking_properties = booking_agent.get_properties(booking_request)
        
        airbnb_agent = AirbnbApifyAgent()
        airbnb_request = airbnb_agent.generate_request(generated_req_obj)
        airbnb_properties = airbnb_agent.get_properties(airbnb_request)
        
        # Combine properties from both sources
        all_properties = booking_properties + airbnb_properties
        
        if not all_properties:
            return JSONResponse(
                status_code=404,
                content={"message": "No properties found matching your criteria"}
            )
        
        # Evaluate properties with vision
        evaluate_agent = EvaluateAgent()
        try:
            results = await evaluate_agent.evaluate(generated_req_obj, all_properties)
        except Exception as e:
            logging.error(f"Error during property evaluation: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error during property evaluation: {str(e)}")
        
        # Limit to requested number of results
        top_results = results[:request.max_results]
        
        # Convert UnifiedProperty objects to dictionaries for JSON response
        formatted_results = []
        for prop in top_results:
            try:
                # The prop is already a UnifiedProperty object, so we can directly use model_dump()
                formatted_results.append(prop.model_dump(exclude={"raw_data"}))
            except Exception as e:
                logging.error(f"Error formatting result: {str(e)}")
        
        return JSONResponse(
            content={
                "status": "success",
                "message": "Property evaluation with vision completed",
                "count": len(formatted_results),
                "results": formatted_results
            }
        )
    
    except Exception as e:
        logging.error(f"Error evaluating properties with vision: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))