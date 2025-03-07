import time
import logging
import asyncio
import base64
import httpx
from io import BytesIO
from typing import List, Dict, Any

from langchain_core.prompts import PromptTemplate, ChatPromptTemplate
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.output_parsers import JsonOutputToolsParser
from langchain_core.runnables import RunnableParallel
from langchain_openai import ChatOpenAI

from src.models.requirement import GeneratedRequirement, UserRequirement, Budget, DateRange
from src.models.apify import ApifyRequest, ApifyResponse
from src.interfaces.llm import gpt_4o_mini, o3_mini, gpt_4o, o1, gemini_flash_2
from src.lib.scraper.apify import ApifyAgent
from src.models.result import Result, Property
from src.lib.evaluate.analyze import AnalyzeUserRequirement

class EvaluateAgent:
    def __init__(self):
        self.llm = o3_mini()
        self.vision_llm = o1()

    async def evaluate(self, user_request: GeneratedRequirement, properties: list[ApifyResponse], include_images: bool = True):
        """
        Evaluate properties in parallel using RunnableParallel
        
        Args:
            user_request: The user's requirements
            properties: List of properties to evaluate
            include_images: Whether to include image analysis
            
        Returns:
            List of evaluated properties with scores
        """
        logging.info(f"Evaluating {len(properties)} properties")
        
        # First, analyze all images in parallel if needed
        image_analyses = {}
        if include_images:
            image_tasks = []
            for i, prop in enumerate(properties):
                if prop.gallery:
                    image_tasks.append(self._analyze_images(prop.gallery))
                else:
                    image_tasks.append(None)
            
            # Wait for all image analyses to complete
            image_results = await asyncio.gather(*[task for task in image_tasks if task is not None])
            
            # Map results back to properties
            result_index = 0
            for i, task in enumerate(image_tasks):
                if task is not None:
                    image_analyses[f"property_{i}"] = image_results[result_index]
                    result_index += 1
                else:
                    image_analyses[f"property_{i}"] = "No images available for analysis."
            
        property_chains = {}
        for i, prop in enumerate(properties):
            property = self._simplify_property(prop)
            image_analysis = image_analyses.get(f"property_{i}", "")
    
        # Create the evaluation prompt template
            prompt = ChatPromptTemplate(
                [
                    SystemMessage(
                        content=f"""You are a roleplaying as an expert in evaluating properties as a short-term real-estate agent.
                Evaluate this property against the my requirements and return a match score and analysis.
                
                Analyze the property based on the following criteria:
                - Price: Does it match the user's budget?
                - Location: Is it in the desired location?
                - Rooms: Does it have the required number of rooms?
                - Amenities: Does it have the requested amenities?
                - Reviews: Are the reviews positive?
                - Style and Vibe: Does the property match the user's style preferences?
                
                Property: {property}
                Image Analysis: {image_analysis}
                
                Return a property match with a score between 0-100 where 100 is a perfect match.
                Weight the scores towards these numbers: 98%, 85%, 75%, 65%, 55%, 45%, 35%
                Your score output should be just the number, no other text.
                
                You must provide detailed reasoning for your score, explaining how well the property matches each aspect of the user's preferences.
                This reasoning will be shown to the user to help them understand why this property received its score.
                Be specific about which preferences were met and which weren't. Format this as a list of sentences, with emojis for each item. Don't use "-" or "•" or "*" or any other bullet point.                
                """
                    ),
                    HumanMessage(
                        content=f"""Hey man! I'm excited to be here with you! I can't wait for you to help me find the perfect short-term rental for me! Here are my imaginary requirements: {str(user_request)}"""
                    )
                ]
            )
            
            chain = (
                prompt 
                | self.llm.bind_tools([Result], tool_choice="any") 
                | JsonOutputToolsParser(return_id=True)
            )
            
            property_chains[f"property_{i}"] = chain.with_config(
                {"run_name": f"evaluate_property_{i}"}
            )

        # Create the parallel runner
        parallel_chain = RunnableParallel(**property_chains)

        try:
            # Run all evaluations in parallel
            results = await parallel_chain.ainvoke({})

            # Process results
            processed_results = []
            for i, prop in enumerate(properties):
                try:
                    result = results[f"property_{i}"][0]["args"]
                    # Add gallery to results
                    result["gallery"] = prop.gallery
                    result["image"] = prop.image
                    result["url"] = prop.url
                    processed_results.append(result)
                    logging.info(f"Evaluated property: {result['name']} with score: {result.get('score', 'N/A')}")
                except Exception as e:
                    logging.error(f"Error processing property {i}: {str(e)}")

            # Sort results by score
            sorted_results = sorted(
                processed_results, 
                key=lambda x: float(x.get('score')), 
                reverse=True
            )

            # Return top 6 results
            return sorted_results[:6]

        except Exception as e:
            logging.error(f"Error in parallel evaluation: {str(e)}")
            raise
    
    async def _analyze_images(self, image_urls: List[str], max_images: int = 6) -> str:
        """Analyze property images using vision model"""
        if not image_urls:
            return "No images available for analysis."
        
        # Limit the number of images to analyze
        image_urls = image_urls[:max_images]
        
        # Create prompt for vision model
        messages = [
            HumanMessage(
                content=[
                    {
                        "type": "text",
                        "text": "Analyze these property images and describe the style, vibe, and aesthetic of the property. Focus on decor, design elements, ambiance, and overall feel. Is it modern, traditional, minimalist, luxurious, cozy, etc.?"
                    },
                    *[
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": url
                            }
                        } for url in image_urls
                    ]
                ]
            )
        ]
        
        # Get analysis from vision model
        response = await self.vision_llm.ainvoke(messages)
        return f"Image Analysis: {response.content}"
    
    def _simplify_property(self, property_data: ApifyResponse) -> Dict[str, Any]:
        """Convert ApifyResponse to a simplified dictionary for the LLM"""
        # Debug logging for image field
        logging.info(f"ApifyResponse image field: {property_data.image}")
        
        amenities = []
        for facility in property_data.facilities:
            if facility.facilities:
                for detail in facility.facilities:
                    if detail.name:
                        amenities.append(detail.name)
        
        # Calculate average review score
        avg_score = 0
        if property_data.categoryReviews:
            scores = [review.score for review in property_data.categoryReviews if review.score is not None]
            if scores:
                avg_score = sum(scores) / len(scores)
        
        result = {
            "name": property_data.name,
            "url": property_data.url,
            "price": property_data.price,
            "location": property_data.address.full if property_data.address else "",
            "rooms": len(property_data.rooms) if property_data.rooms else 0,
            "amenities": amenities[:10],
            "reviews": [{"title": review.title, "score": review.score} 
                       for review in property_data.categoryReviews[:5] if review.title],
            "score": f"{avg_score:.1f}/10" if avg_score else "No reviews",
            "image": property_data.image,
            "description": property_data.description,
            "gallery": property_data.gallery
        }
        
        # Debug logging for simplified property
        logging.info(f"Simplified property image field: {result['image']}")
        
        return result

if __name__ == "__main__":
    user_request = UserRequirement(
        query="New York",
        number_of_rooms=2,
        adults=3,
        children=0,
        date="from tomorrow to 2 weeks",
        budget=Budget(min=0, max=1000),
        preferences="I want a property with a pool, quiet location, a good view, proximity to co-working space"
    )
    
    generate_requirement = AnalyzeUserRequirement().analyze_user_requirement(user_request)
    generate_requirement = GeneratedRequirement(**generate_requirement)
    
    apify_agent = ApifyAgent()
    apify_request = apify_agent.generate_request(generate_requirement)
    properties = apify_agent.get_properties(apify_request)
    
    # Use the RunnableParallel version
    start_time = time.time()
    evaluate_agent = EvaluateAgent()
    response = evaluate_agent.evaluate(user_request, properties)
    end_time = time.time()
    print(f"Evaluated {len(response)} properties in {end_time - start_time:.2f} seconds")
    for prop in response:
        print(f"Property: {prop['name']}, Score: {prop['score']}")