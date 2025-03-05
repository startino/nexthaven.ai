from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import logging
import time

from src.models.apify import ApifyRequest, ApifyResponse
from src.models.requirement import GeneratedRequirement, UserRequirement, Budget, DateRange
# from src.lib.evaluate.agents import EvaluateAgent
from src.lib.evaluate.agents_with_vision import EvaluateAgent
from src.lib.evaluate.analyze import AnalyzeUserRequirement
from src.lib.scraper.apify import ApifyAgent
from src.models.result import Result

router = APIRouter(prefix="/properties")

class PropertyEvaluationRequest(BaseModel):
    query: str
    date: str
    budget: Budget
    adults: int = 2
    children: int = 0
    number_of_rooms: int = 1
    property_type: str = "Hotels"
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
            property_type=request.property_type,
            preferences=request.preferences
        )
        
        # Analyze with preferences included
        analyzer = AnalyzeUserRequirement()
        generated_requirements = analyzer.analyze_user_requirement(user_requirement)
        generated_req_obj = GeneratedRequirement(**generated_requirements)
        
        apify_agent = ApifyAgent()
        apify_request = apify_agent.generate_request(generated_req_obj)
        properties = apify_agent.get_properties(apify_request)
        
        if not properties:
            return JSONResponse(
                status_code=404,
                content={"message": "No properties found matching your criteria"}
            )
        
        # Evaluate properties
        evaluate_agent = EvaluateAgent()
        results = await evaluate_agent.evaluate(generated_req_obj, properties)
        
        # Limit to requested number of results
        top_results = results[:5]
        
        # Convert to Result model
        formatted_results = []
        for prop in top_results:
            try:
                # Extract score from the format "85/100"
                score_value = float(prop.get("score", "0").split("/")[0])
                
                # Fix the gallery field - ensure it's a flat list of strings
                gallery = prop.get("gallery", [])
                if gallery and isinstance(gallery, list):
                    # If the first element is itself a list, flatten it
                    if gallery and isinstance(gallery[0], list):
                        gallery = gallery[0]
                
                # Convert to Result model
                result = Result(
                    url=prop.get("url", ""),
                    name=prop.get("name", ""),
                    price=round(float(prop.get("price", 0))),
                    location=prop.get("location", ""),
                    rooms=prop.get("rooms", 0),
                    baths=prop.get("baths", 0),
                    amenities=prop.get("amenities", []),
                    score=str(score_value),
                    image=prop.get("image", ""),
                    gallery=gallery
                )
                formatted_results.append(result.model_dump())
            except Exception as e:
                logging.error(f"Error formatting result: {str(e)}")
                logging.error(f"Gallery data: {prop.get('gallery')}")
        
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