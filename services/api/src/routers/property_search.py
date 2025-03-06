from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import logging
import time

from src.models.apify import ApifyRequest, ApifyResponse
from src.models.requirement import GeneratedRequirement, UserRequirement, Budget, DateRange
from src.lib.evaluate.analyze import AnalyzeUserRequirement
from src.lib.scraper.apify import ApifyAgent

router = APIRouter(prefix="/properties")

class PropertySearchRequest(BaseModel):
    query: str
    date: str
    budget: Budget
    adults: int = 2
    children: int = 0
    number_of_rooms: int = 1
    # property_type: str = "Hotels"

@router.post("/search")
async def search_properties(request: PropertySearchRequest):
    """
    Initial search API that starts the Apify scraping process based on user's basic requirements.
    This is called when the user enters initial details and clicks 'Next'.
    """
    logging.info(f"/properties/search: Starting property search for '{request.query}'")
    
    try:
        start_time = time.time()
        
        # Convert request to UserRequirement (without preferences)
        user_requirement = UserRequirement(
            query=request.query,
            date=request.date,
            budget=request.budget,
            adults=request.adults,
            children=request.children,
            number_of_rooms=request.number_of_rooms,
            # property_type=request.property_type,
        )
        
        analyzer = AnalyzeUserRequirement()
        generated_requirements = analyzer.analyze_user_requirement(user_requirement)
        generated_req_obj = GeneratedRequirement(**generated_requirements)
        
        print(generated_req_obj)
        
        apify_agent = ApifyAgent()
        apify_request = apify_agent.generate_request(generated_req_obj)
        apify_response = apify_agent.get_properties(apify_request)
        
        print(apify_response)
        
        end_time = time.time()
        
        return JSONResponse(
            content={
                "status": "success",
                "message": "Property search completed",
                "search_id": f"search_{int(time.time())}",  # This would be a real ID in production
                "processing_time": f"{end_time - start_time:.2f} seconds"
            }
        )
    
    except Exception as e:
        logging.error(f"Failed to search properties: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 