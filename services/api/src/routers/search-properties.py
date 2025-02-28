from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from typing import AsyncGenerator, List, Optional, Dict, Any
import json
import logging
import asyncio
import time

from src.models.apify import ApifyRequest, ApifyResponse
from src.models.requirement import GeneratedRequirement, UserRequirement, Budget, DateRange
from src.lib.evaluate.agents import EvaluateAgent, AsyncEvaluateAgent
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
    property_type: str = "Hotels"
    preferences: str = ""
    max_results: int = 5

async def property_evaluation_generator(
    user_request: UserRequirement,
    max_results: int = 5
) -> AsyncGenerator[bytes, None]:
    """
    Process property search and evaluation, yielding results as they become available
    """
    try:
        # Step 1: Analyze user requirements
        # yield json.dumps({
        #     "status": "processing",
        #     "stage": "analyzing_requirements",
        #     "message": "Analyzing your requirements..."
        # }).encode("utf-8")
        
        analyzer = AnalyzeUserRequirement()
        generated_requirements = analyzer.analyze_user_requirement(user_request)
        
        # yield json.dumps({
        #     "status": "processing",
        #     "stage": "requirements_analyzed",
        #     "message": "Requirements analyzed successfully",
        #     "requirements": generated_requirements
        # }).encode("utf-8")
        
        # Step 2: Search for properties
        # yield json.dumps({
        #     "status": "processing",
        #     "stage": "searching_properties",
        #     "message": "Searching for properties that match your criteria..."
        # }).encode("utf-8")
        
        apify_agent = ApifyAgent()
        apify_request = apify_agent.generate_request(GeneratedRequirement(**generated_requirements))
        properties = apify_agent.get_properties(apify_request)
        
        # yield json.dumps({
        #     "status": "processing",
        #     "stage": "properties_found",
        #     "message": f"Found {len(properties)} properties matching your criteria",
        #     "count": len(properties)
        # }).encode("utf-8")
        
        # Step 3: Evaluate properties
        # yield json.dumps({
        #     "status": "processing",
        #     "stage": "evaluating_properties",
        #     "message": "Evaluating properties based on your preferences..."
        # }).encode("utf-8")
        
        # Use async evaluation for streaming results
        async_agent = AsyncEvaluateAgent()
        
        # Start evaluation
        evaluation_task = asyncio.create_task(
            async_agent.evaluate(
                GeneratedRequirement(**generated_requirements),
                properties,
                max_concurrent=3
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
            yield (json.dumps(prop) + "\n").encode("utf-8")
            
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
            property_type=request.property_type,
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

@router.post("/evaluate")
async def evaluate_properties(request: ApifyRequest):
    """
    Evaluate properties from Apify data
    """
    try:
        # Get properties from Apify
        apify_agent = ApifyAgent()
        properties = apify_agent.get_properties(request)
        
        if not properties:
            return JSONResponse(
                status_code=404,
                content={"message": "No properties found matching your criteria"}
            )
        
        # Create a basic requirement from the request
        requirement = GeneratedRequirement(
            query=request.search,
            date_range=DateRange(
                start_date=request.checkIn,
                end_date=request.checkOut
            ),
            budget=Budget(
                min=int(request.minMaxPrice.split('-')[0]),
                max=int(request.minMaxPrice.split('-')[1])
            ),
            adults=request.adults,
            children=request.children,
            number_of_rooms=request.rooms,
            property_type=request.propertyType,
            preferences=[]
        )
        
        # Evaluate properties
        evaluate_agent = EvaluateAgent()
        results = evaluate_agent.evaluate(requirement, properties, max_workers=5)
        
        return JSONResponse(content={"results": results})
    
    except Exception as e:
        logging.error(f"Error evaluating properties: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/evaluate-vision")
async def evaluate_properties_vision(request: ApifyRequest):
    """
    Evaluate properties with vision analysis from Apify data
    """
    try:
        # Get properties from Apify
        apify_agent = ApifyAgent()
        properties = apify_agent.get_properties(request)
        
        if not properties:
            return JSONResponse(
                status_code=404,
                content={"message": "No properties found matching your criteria"}
            )
        
        # Create a basic requirement from the request
        requirement = GeneratedRequirement(
            query=request.search,
            date_range=DateRange(
                start_date=request.checkIn,
                end_date=request.checkOut
            ),
            budget=Budget(
                min=int(request.minMaxPrice.split('-')[0]),
                max=int(request.minMaxPrice.split('-')[1])
            ),
            adults=request.adults,
            children=request.children,
            number_of_rooms=request.rooms,
            property_type=request.propertyType,
            preferences=[]
        )
        
        # Background task to process vision analysis
        background_tasks = BackgroundTasks()
        
        # Start a background task for processing
        def process_vision_analysis():
            try:
                # This would be implemented to save results to a database or cache
                # For now, we'll just log that it's running
                logging.info("Background vision analysis started")
                time.sleep(5)  # Simulate processing time
                logging.info("Background vision analysis completed")
            except Exception as e:
                logging.error(f"Error in background vision analysis: {str(e)}")
        
        background_tasks.add_task(process_vision_analysis)
        
        # For now, return a message that processing has started
        return JSONResponse(
            content={"message": "Vision analysis started in background"},
            background=background_tasks
        )
    
    except Exception as e:
        logging.error(f"Error evaluating properties with vision: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))