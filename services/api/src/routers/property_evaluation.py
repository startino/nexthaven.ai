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
# from src.lib.evaluate.agents import EvaluateAgent
from src.lib.evaluate.agents_with_vision import EvaluateAgent
from src.lib.evaluate.analyze import AnalyzeUserRequirement
from src.lib.scraper.booking_apify import BookingApifyAgent
from src.lib.scraper.airbnb_apify import AirbnbApifyAgent
from src.models.result import Result
from src.models.unified_property import UnifiedProperty

router = APIRouter(prefix="/properties")

class PropertyEvaluationRequest(BaseModel):
    query: str
    date: str
    budget: Budget
    adults: int = 2
    children: int = 0
    number_of_rooms: int = 1
    # property_type: str = "Hotels"
    preferences: str

@router.post("/evaluate")
async def evaluate_properties(request: PropertyEvaluationRequest):
    """
    Evaluation API that scores properties based on user's complete requirements including preferences.
    This is called when the user enters preferences and clicks 'Submit'.
    """
    logging.info(f"/properties/evaluate: Evaluating properties")
    
    try:
        start_time = time.time()
                
        # Create complete user requirement with preferences
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
        
        # Analyze with preferences included
        analyzer = AnalyzeUserRequirement()
        generated_requirements = analyzer.analyze_user_requirement(user_requirement)
        
        # Ensure generated_requirements is a dictionary before unpacking
        if isinstance(generated_requirements, dict):
            generated_req_obj = GeneratedRequirement(**generated_requirements)
        else:
            # If it's already a GeneratedRequirement object, use it directly
            generated_req_obj = generated_requirements
        
        # Get properties from both Booking.com and Airbnb in parallel
        booking_agent = BookingApifyAgent()
        airbnb_agent = AirbnbApifyAgent()
        
        booking_request = booking_agent.generate_request(generated_req_obj)
        airbnb_request = airbnb_agent.generate_request(generated_req_obj)
        
        # Execute both scrapers concurrently
        booking_properties, airbnb_properties = await asyncio.gather(
            booking_agent.get_properties(booking_request),
            airbnb_agent.get_properties(airbnb_request)
        )
        
        # Combine properties from both sources
        all_properties = booking_properties + airbnb_properties
        
        if not all_properties:
            return JSONResponse(
                status_code=404,
                content={"message": "No properties found matching your criteria"}
            )
        
        # Evaluate properties
        evaluate_agent = EvaluateAgent()
        results = await evaluate_agent.evaluate(generated_req_obj, all_properties)
        
        # Limit to requested number of results
        top_results = results[:18]
        
        # Convert UnifiedProperty objects to dictionaries for JSON response
        formatted_results = []
        for prop in top_results:
            try:
                # The prop is already a UnifiedProperty object, so we can directly use model_dump()
                formatted_results.append(prop.model_dump(exclude={"raw_data"}))
                logging.info(f"Evaluated property: {prop.name} with score: {prop.score}")
            except Exception as e:
                logging.error(f"Error formatting result: {str(e)}")
        
        end_time = time.time()
        
        return JSONResponse(
            content={
                "status": "success",
                "message": "Property evaluation completed",
                "count": len(formatted_results),
                "results": formatted_results,
                "processing_time": f"{end_time - start_time:.2f} seconds"
            }
        )
    
    except Exception as e:
        logging.error(f"Error evaluating properties: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 