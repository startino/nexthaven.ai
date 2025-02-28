import time
import logging
import asyncio
import concurrent.futures
import base64
import httpx
from io import BytesIO
from typing import List, Dict, Any

from langchain_core.prompts import PromptTemplate, ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputToolsParser
from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI

from src.models.requirement import GeneratedRequirement, UserRequirement, Budget, DateRange
from src.models.apify import ApifyRequest, ApifyResponse
from src.interfaces.llm import o3_mini, gpt_4o
from src.lib.scraper.apify import ApifyAgent
from src.models.result import Result, Property
from src.lib.evaluate.analyze import AnalyzeUserRequirement

class EvaluateAgent:
    def __init__(self):
        self.llm = o3_mini()
        self.vision_llm = gpt_4o()

    def evaluate(self, user_request: GeneratedRequirement, properties: list[ApifyResponse], max_workers: int = 5, include_images: bool = True):
        """
        Evaluate properties in parallel using multiple workers
        
        Args:
            user_request: The user's requirements
            properties: List of properties to evaluate
            max_workers: Maximum number of concurrent workers
            include_images: Whether to include image analysis
            
        Returns:
            List of evaluated properties with scores
        """
        logging.info(f"Evaluating {len(properties)} properties with {max_workers} workers")
        
        # Create the evaluation prompt template
        prompt = PromptTemplate.from_template(
            """You are an expert in evaluating properties. Evaluate this property against the user's requirements and return a match score and analysis.
            
            Analyze the property based on the following criteria:
            - Price: Does it match the user's budget?
            - Location: Is it in the desired location?
            - Rooms: Does it have the required number of rooms?
            - Amenities: Does it have the requested amenities?
            - Reviews: Are the reviews positive?
            - Style and Vibe: Does the property match the user's style preferences?
            
            User's requirement: {user_request}
            Property: {property}
            {image_analysis}
            
            Return a property match with a score between 0-100 where 100 is a perfect match.
            """
        )
        
        # Use ThreadPoolExecutor for parallel processing
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Create a list of futures
            futures = [
                executor.submit(self._evaluate_single_property, prompt, user_request, prop, include_images)
                for prop in properties
            ]
            
            # Collect results as they complete
            results = []
            for future in concurrent.futures.as_completed(futures):
                try:
                    result = future.result()
                    results.append(result)
                    logging.info(f"Evaluated property: {result['name']} with score: {result.get('score', 'N/A')}")
                except Exception as e:
                    logging.error(f"Error evaluating property: {str(e)}")
        
        # Sort results by score (highest first)
        sorted_results = sorted(results, key=lambda x: float(x.get('score', '0').split('/')[0]), reverse=True)
        
        # Add the gallery to the results by mapping Url to the property
        for result in sorted_results:
            result["gallery"] = [prop.gallery for prop in properties if prop.url == result["url"]]
        
        # Return top 5 results
        return sorted_results[:5]
    
    async def _analyze_images(self, image_urls: List[str], max_images: int = 3) -> str:
        """Analyze property images using vision model"""
        if not image_urls:
            return "No images available for analysis."
        
        # Limit the number of images to analyze
        image_urls = image_urls[:max_images]
        
        try:
            # Download images in parallel
            async with httpx.AsyncClient() as client:
                image_responses = await asyncio.gather(
                    *[client.get(url, timeout=10.0) for url in image_urls],
                    return_exceptions=True
                )
            
            # Process successful image downloads
            valid_images = []
            for i, response in enumerate(image_responses):
                if isinstance(response, Exception):
                    logging.warning(f"Failed to download image {i}: {str(response)}")
                    continue
                    
                if response.status_code == 200:
                    # Convert image to base64
                    image_data = base64.b64encode(response.content).decode('utf-8')
                    valid_images.append(
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_data}"
                            }
                        }
                    )
            
            if not valid_images:
                return "Failed to download any property images for analysis."
            
            # Create prompt for vision model
            messages = [
                HumanMessage(
                    content=[
                        {
                            "type": "text",
                            "text": "Analyze these property images and describe the style, vibe, and aesthetic of the property. Focus on decor, design elements, ambiance, and overall feel. Is it modern, traditional, minimalist, luxurious, cozy, etc.?"
                        },
                        *valid_images
                    ]
                )
            ]
            
            # Get analysis from vision model
            response = await self.vision_llm.ainvoke(messages)
            return f"Image Analysis: {response.content}"
            
        except Exception as e:
            logging.error(f"Error analyzing images: {str(e)}")
            return "Error analyzing property images."
    
    def _evaluate_single_property(self, prompt, user_request, property_data, include_images=True):
        """Evaluate a single property using the LLM"""
        try:
            # Convert ApifyResponse to a simplified format for the LLM
            simplified_property = self._simplify_property(property_data)
            
            # Analyze images if requested
            image_analysis = ""
            if include_images and property_data.gallery:
                # Run image analysis in an async context
                image_analysis = asyncio.run(self._analyze_images(property_data.gallery))
            
            # Create a chain for this specific evaluation
            chain = prompt | self.llm.bind_tools([Result], tool_choice="any") | JsonOutputToolsParser(return_id=True)
            
            # Invoke the chain
            response = chain.invoke(
                {
                    "user_request": user_request,
                    "property": simplified_property,
                    "image_analysis": image_analysis
                }
            )
            
            return response[0]["args"]
        except Exception as e:
            logging.error(f"Error in property evaluation: {str(e)}")
            # Return a minimal result with error information
            return {
                "name": getattr(property_data, "name", "Unknown"),
                "url": getattr(property_data, "url", ""),
                "score": "0/100",
                "error": str(e)
            }
    
    def _simplify_property(self, property_data: ApifyResponse) -> Dict[str, Any]:
        """Convert ApifyResponse to a simplified dictionary for the LLM"""
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
        
        return {
            "name": property_data.name,
            "url": property_data.url,
            "price": property_data.price,
            "location": property_data.address.full if property_data.address else "",
            "rooms": len(property_data.rooms) if property_data.rooms else 0,
            "amenities": amenities[:10],
            "reviews": [{"title": review.title, "score": review.score} 
                       for review in property_data.categoryReviews[:5] if review.title],
            "score": f"{avg_score:.1f}/10" if avg_score else "No reviews",
            "image_url": property_data.image,
            "description": property_data.description,
            "gallery": property_data.gallery
        }

# Async version for even better performance
class AsyncEvaluateAgent:
    def __init__(self):
        self.llm = o3_mini()
        
    async def evaluate(self, user_request: GeneratedRequirement, properties: list[ApifyResponse], max_concurrent: int = 5, include_images: bool = True):
        """
        Evaluate properties concurrently using asyncio
        
        Args:
            user_request: The user's requirements
            properties: List of properties to evaluate
            max_concurrent: Maximum number of concurrent evaluations
            include_images: Whether to include image analysis
            
        Returns:
            List of evaluated properties with scores
        """
        logging.info(f"Evaluating {len(properties)} properties with {max_concurrent} concurrent tasks")
        
        # Create the evaluation prompt template
        prompt = PromptTemplate.from_template(
            """You are an expert in evaluating properties. Evaluate this property against the user's requirements and return a match score and analysis.
            
            Analyze the property based on the following criteria:
            - Price: Does it match the user's budget?
            - Location: Is it in the desired location?
            - Rooms: Does it have the required number of rooms?
            - Amenities: Does it have the requested amenities?
            - Reviews: Are the reviews positive?
            - Style and Vibe: Does the property match the user's style preferences?
            
            User's requirement: {user_request}
            Property: {property}
            {image_analysis}
            
            Return a property match with a score between 0-100 where 100 is a perfect match.
            """
        )
        
        # Create a semaphore to limit concurrent tasks
        semaphore = asyncio.Semaphore(max_concurrent)
        
        # Create evaluation tasks
        tasks = []
        for prop in properties:
            task = self._evaluate_with_semaphore(semaphore, prompt, user_request, prop, include_images)
            tasks.append(task)
        
        # Run all tasks concurrently and collect results
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out exceptions and sort by score
        valid_results = [r for r in results if not isinstance(r, Exception)]
        sorted_results = sorted(valid_results, key=lambda x: float(x.get('score', '0').split('/')[0]), reverse=True)
        
        # Return top 5 results
        return sorted_results[:5]
    
    async def _evaluate_with_semaphore(self, semaphore, prompt, user_request, property_data, include_images):
        """Evaluate a property with a semaphore to limit concurrency"""
        async with semaphore:
            return await self._evaluate_single_property(prompt, user_request, property_data, include_images)
    
    async def _analyze_images(self, image_urls: List[str], max_images: int = 3) -> str:
        """Analyze property images using vision model"""
        
        logging.info(f"Analyzing {len(image_urls)} images")
        
        if not image_urls:
            return "No images available for analysis."
        
        # Limit the number of images to analyze
        image_urls = image_urls[:max_images]
        
        try:
            # Download images in parallel
            async with httpx.AsyncClient() as client:
                image_responses = await asyncio.gather(
                    *[client.get(url, timeout=10.0) for url in image_urls],
                    return_exceptions=True
                )
            
            # Process successful image downloads
            valid_images = []
            for i, response in enumerate(image_responses):
                if isinstance(response, Exception):
                    logging.warning(f"Failed to download image {i}: {str(response)}")
                    continue
                    
                if response.status_code == 200:
                    # Convert image to base64
                    image_data = base64.b64encode(response.content).decode('utf-8')
                    valid_images.append(
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_data}"
                            }
                        }
                    )
            
            if not valid_images:
                return "Failed to download any property images for analysis."
            
            # Create prompt for vision model
            messages = [
                HumanMessage(
                    content=[
                        {
                            "type": "text",
                            "text": "Analyze these property images and describe the style, vibe, and aesthetic of the property. Focus on decor, design elements, ambiance, and overall feel. Is it modern, traditional, minimalist, luxurious, cozy, etc.?"
                        },
                        *valid_images
                    ]
                )
            ]
            
            # Get analysis from vision model
            response = await self.llm.ainvoke(messages)
            print(response)
            return f"Image Analysis: {response.content}"
            
        except Exception as e:
            logging.error(f"Error analyzing images: {str(e)}")
            return "Error analyzing property images."
    
    async def _evaluate_single_property(self, prompt, user_request, property_data, include_images=True):
        """Evaluate a single property using the LLM asynchronously"""
        try:
            # Convert ApifyResponse to a simplified format for the LLM
            simplified_property = self._simplify_property(property_data)
            
            # Analyze images if requested
            image_analysis = ""
            if include_images and property_data.gallery:
                image_analysis = await self._analyze_images(property_data.gallery)
            
            # Create a chain for this specific evaluation
            chain = prompt | self.llm.bind_tools([Result], tool_choice="any") | JsonOutputToolsParser(return_id=True)
            
            # Invoke the chain
            response = await chain.ainvoke(
                {
                    "user_request": user_request,
                    "property": simplified_property,
                    "image_analysis": image_analysis
                }
            )
            
            return response[0]["args"]
        except Exception as e:
            logging.error(f"Error in property evaluation: {str(e)}")
            # Return a minimal result with error information
            return {
                "name": getattr(property_data, "name", "Unknown"),
                "url": getattr(property_data, "url", ""),
                "score": "0/100",
                "error": str(e)
            }
    
    def _simplify_property(self, property_data: ApifyResponse) -> Dict[str, Any]:
        """Convert ApifyResponse to a simplified dictionary for the LLM"""
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
        
        return {
            "name": property_data.name,
            "url": property_data.url,
            "price": property_data.price,
            "location": property_data.address.full if property_data.address else "",
            "rooms": len(property_data.rooms) if property_data.rooms else 0,
            "amenities": amenities[:10],  # Limit to top 10 amenities
            "reviews": [{"title": review.title, "score": review.score} 
                       for review in property_data.categoryReviews[:5] if review.title],
            "score": f"{avg_score:.1f}/10" if avg_score else "No reviews",
            "image_url": property_data.image,
            "description": property_data.description
        }

if __name__ == "__main__":
    user_request = UserRequirement(
        query="New York",
        number_of_rooms=2,
        adults=3,
        children=0,
        date="from tomorrow to 2 weeks",
        budget=Budget(min=0, max=1000),
        property_type="Apartments",
        preferences="I want a property with a pool, quiet location, a good view, proximity to co-working space"
    )
    
    generate_requirement = AnalyzeUserRequirement().analyze_user_requirement(user_request)
    generate_requirement = GeneratedRequirement(**generate_requirement)
    
    apify_agent = ApifyAgent()
    apify_request = apify_agent.generate_request(generate_requirement)
    properties = apify_agent.get_properties(apify_request)
    
    # Use the threaded version
    start_time = time.time()
    evaluate_agent = EvaluateAgent()
    response = evaluate_agent.evaluate(user_request, properties, max_workers=5)
    end_time = time.time()
    print(f"Evaluated {len(response)} properties in {end_time - start_time:.2f} seconds")
    for prop in response:
        print(f"Property: {prop['name']}, Score: {prop['score']}")
    
    # For async usage (requires running in an async context)
    # async def main():
    #     start_time = time.time()
    #     async_agent = AsyncEvaluateAgent()
    #     async_response = await async_agent.evaluate(user_request, properties, max_concurrent=5)
    #     end_time = time.time()
    #     print(f"Async evaluated {len(async_response)} properties in {end_time - start_time:.2f} seconds")
    #     for prop in async_response:
    #         print(f"Property: {prop['name']}, Score: {prop['score']}")
    # 
    # import asyncio
    # asyncio.run(main())