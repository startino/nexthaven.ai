import time
import logging
import asyncio
import base64
import httpx
from io import BytesIO
from typing import List, Dict, Any, Union

from langchain_core.prompts import PromptTemplate, ChatPromptTemplate
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.output_parsers import JsonOutputToolsParser
from langchain_core.runnables import RunnableParallel, RunnableLambda
from langchain_openai import ChatOpenAI

from src.models.requirement import GeneratedRequirement, UserRequirement, Budget, DateRange
from src.models.apify import BookingApifyRequest, BookingApifyResponse
from src.models.airbnb_apify import AirbnbApifyResponse, Price
from src.interfaces.llm import gemini_pro_exp, gpt_4o_mini, o3_mini, gpt_4o, o1, gemini_flash_2, deepseek_r1_distill, ministral_8b
from src.lib.scraper.booking_apify import BookingApifyAgent
from src.lib.scraper.airbnb_apify import AirbnbApifyAgent
from src.models.result import Result, Property
from src.lib.evaluate.analyze import AnalyzeUserRequirement
from src.models.unified_property import UnifiedProperty, PricingModel, CapacityModel, FeaturesModel, MediaModel

class EvaluateAgent:
    def __init__(self):
        self.llm = o3_mini()
        self.vision_llm = gemini_flash_2()

    async def evaluate(self, user_request: GeneratedRequirement, properties: list[BookingApifyResponse | AirbnbApifyResponse], include_images: bool = True):
        """
        Evaluate properties in parallel using RunnableParallel
        
        Args:
            user_request: The user's requirements
            properties: List of properties to evaluate
            include_images: Whether to include image analysis
            
        Returns:
            List of evaluated properties with scores as UnifiedProperty objects
        """
        logging.info(f"Evaluating {len(properties)} properties")
        
        # First, analyze all images in parallel if needed
        image_analyses = {}
        if include_images:
            image_tasks = []
            for i, prop in enumerate(properties):
                # Handle both Booking.com and Airbnb property types
                if isinstance(prop, BookingApifyResponse) and prop.gallery:
                    image_tasks.append(self._analyze_images(prop.gallery))
                elif isinstance(prop, AirbnbApifyResponse) and prop.images:
                    # Extract image URLs from Airbnb images
                    image_urls = [img.imageUrl for img in prop.images if img.imageUrl]
                    if image_urls:
                        image_tasks.append(self._analyze_images(image_urls))
                    else:
                        image_tasks.append(None)
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

            # Remove properties not needed by LLM (to save tokens)
            property["gallery"] = []
            property["image"] = ""
            property["source"] = ""
    
        # Create the evaluation prompt template
            prompt = ChatPromptTemplate(
                [
                    SystemMessage(
                        content=f"""You are a roleplaying as an expert in evaluating properties as a short-term real-estate agent.
                Evaluate this property against the my requirements and return a match score and analysis.
                
                Analyze the property based on the following criteria:
                - Price:
                  - Does it match the user's budget? (Don't focus too much on nightly price, focus on the total price.)
                  - The price is a big factor in the score, if the price is too high, the score should be quite low, unless everything else is perfect.
                  - If the price is below the user's budget, the score can still be high.
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
                Be specific about which preferences were met and which weren't.
                Format this as a list of sentences, with emojis for each item. E.g. ✅, 🏆, 👌, 👎. Make the emojis relevant to the item and scoring of that attribute, but don't overdo them.
                Don't use "-" or "•" or "*" or any other bullet point. Use a colon ":" to separate the item and the score.
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

        # Run all evaluations in parallel
        # Use return_exceptions=True to handle errors without failing the entire process
        logging.info(f"Starting parallel evaluation of {len(properties)} properties")
        
        try:
            results = await parallel_chain.ainvoke({}, return_exceptions=True)
            logging.info(f"Completed parallel evaluation, processing results")
        except Exception as e:
            # This should never happen with return_exceptions=True, but just in case
            error_msg = str(e)
            logging.error(f"Unexpected error in parallel evaluation: {error_msg}")
            
            # Create an empty results dictionary that we can still process
            results = {}
            for i in range(len(properties)):
                results[f"property_{i}"] = Exception(f"Parallel evaluation failed: {error_msg}")
                
            logging.warning("Created default error results for all properties to allow processing to continue")

        # Count successful and failed evaluations
        success_count = 0
        error_count = 0
        
        # Process results
        processed_results: list[UnifiedProperty] = []
        for i, prop in enumerate(properties):
            try:
                # Check if the result is an exception or missing
                if i >= len(properties) or f"property_{i}" not in results:
                    logging.error(f"Missing result for property {i}")
                    error_count += 1
                    continue
                
                result = results.get(f"property_{i}")
                
                # Check if the result is an exception
                if isinstance(result, Exception):
                    error_count += 1
                    logging.error(f"Error evaluating property {i}: {str(result)}")
                    continue
                
                # Check if result has error field (from dict-like errors)
                if isinstance(result, dict) and "error" in result:
                    error_count += 1
                    error_message = str(result.get("error", "Unknown error"))
                    logging.error(f"Error evaluating property {i}: {error_message}")
                    continue
                
                # Extra safety check to ensure result has expected structure
                if not isinstance(result, list) or not result or not isinstance(result[0], dict) or "args" not in result[0]:
                    error_count += 1
                    logging.error(f"Unexpected result structure for property {i}: {result}")
                    continue
                
                # Extract the result arguments
                result_args = result[0]["args"]
                success_count += 1
                
                # Create a UnifiedProperty object
                unified_prop = self._create_unified_property(prop, result_args)
                processed_results.append(unified_prop)
                
                logging.info(f"Evaluated property: {unified_prop.name} with score: {unified_prop.score}")
            except Exception as e:
                error_count += 1
                logging.error(f"Error processing property {i}: {str(e)}")
                # Skip this property - don't add it to processed_results

        logging.info(f"Evaluation summary: {success_count} successful, {error_count} errors (skipped)")
        
        # Sort results by score (now using numeric values directly)
        if processed_results:
            sorted_results = sorted(
                processed_results,
                key=lambda x: x.score,
                reverse=True
            )

            return sorted_results
        else:
            logging.warning("No properties were successfully processed")
            return []
        
    
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
                        } for url in image_urls if url
                    ]
                ]
            )
        ]
        
        # Get analysis from vision model
        response = await self.vision_llm.ainvoke(messages)
        return f"Image Analysis: {response.content}"
    
    def _simplify_property(self, property_data: BookingApifyResponse | AirbnbApifyResponse) -> Dict[str, Any]:
        """Convert ApifyResponse to a simplified dictionary for the LLM"""
        if isinstance(property_data, BookingApifyResponse):
            return self._simplify_booking_property(property_data)
        elif isinstance(property_data, AirbnbApifyResponse):
            return self._simplify_airbnb_property(property_data)
        else:
            raise ValueError(f"Unsupported property type: {type(property_data)}")
    
    def _simplify_booking_property(self, property_data: BookingApifyResponse) -> Dict[str, Any]:
        """Convert BookingApifyResponse to a simplified dictionary for the LLM"""
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
            "gallery": property_data.gallery,
            "source": "booking"
        }
        
        return result
    
    def _simplify_airbnb_property(self, property_data: AirbnbApifyResponse) -> Dict[str, Any]:
        """Convert AirbnbApifyResponse to a simplified dictionary for the LLM"""
        # Extract amenities from Airbnb property
        amenities = []
        for amenity_group in property_data.amenities:
            for value in amenity_group.values:
                if value.title:
                    amenities.append(value.title)
        
        # Calculate average review score
        avg_score = 0
        if property_data.rating and property_data.rating.guestSatisfaction:
            avg_score = property_data.rating.guestSatisfaction
        
        # Extract images
        image_urls = [img.imageUrl for img in property_data.images if img.imageUrl]
        main_image = property_data.thumbnail if property_data.thumbnail else (image_urls[0] if image_urls else "")
        
        # Extract price
        price_value = None
        if property_data.price and property_data.price.price:
            # Try to extract numeric value from price string
            try:
                price_str = property_data.price.price
                price_value = float(''.join(filter(lambda x: x.isdigit() or x == '.', price_str)))
            except:
                price_value = None
        
        # Get location
        location = property_data.location if property_data.location else ""
        
        # Get room count (estimate from person capacity)
        room_count = 1  # Default assumption
        if property_data.personCapacity:
            # Rough estimate: 1 room for every 2 people
            room_count = max(1, property_data.personCapacity // 2)
        
        result = {
            "name": property_data.title,
            "url": property_data.url,
            "price": price_value,
            "location": location,
            "rooms": room_count,
            "amenities": amenities[:10],
            "reviews": [],  # No direct review titles in Airbnb model
            "score": f"{avg_score:.1f}/10" if avg_score else "No reviews",
            "image": main_image,
            "description": property_data.description,
            "gallery": image_urls,
            "source": "airbnb"
        }
        
        return result
    
    def _create_unified_property(self, property_data: BookingApifyResponse | AirbnbApifyResponse, evaluation_result: Dict[str, Any]) -> UnifiedProperty:
        """Convert property data and evaluation result to a UnifiedProperty object"""
        # Determine source
        source = "Booking.com" if isinstance(property_data, BookingApifyResponse) else "Airbnb"
        
        # Extract property ID
        if isinstance(property_data, BookingApifyResponse):
            property_id = str(hash(property_data.url))  # Generate ID from URL for Booking.com
            name = property_data.name
            description = property_data.description
            url = property_data.url
            location = property_data.address.full if property_data.address else ""
            
            # Extract pricing
            if isinstance(property_data.price, str):
                total = float(property_data.price.replace("$", "").replace(",", ""))
            else:
                total = property_data.price

            # Extract capacity
            bedrooms = len(property_data.rooms) if property_data.rooms else 1
            beds = sum(room.persons or 1 for room in property_data.rooms) if property_data.rooms else 1
            
            # Extract features
            amenities = []
            for facility in property_data.facilities:
                if facility.facilities:
                    for detail in facility.facilities:
                        if detail.name:
                            amenities.append(detail.name)
            
            # Extract media
            main_image = property_data.image
            gallery = property_data.gallery if property_data.gallery else []
            
        else:  # AirbnbApifyResponse
            property_id = property_data.id
            name = property_data.title
            description = property_data.description if property_data.description else ""
            url = property_data.url
            location = property_data.location if property_data.location else ""
            
            # Extract pricing
            if isinstance(property_data.price, str):
                total = float(property_data.price.replace("$", "").replace(",", ""))
            else:
                total = property_data.price
                
            # Extract capacity
            bedrooms = 1  # Default assumption
            beds = property_data.personCapacity if property_data.personCapacity else 1
            
            # Extract features
            amenities = []
            for amenity_group in property_data.amenities:
                for value in amenity_group.values:
                    if value.title:
                        amenities.append(value.title)
            
            # Extract media
            image_urls = [img.imageUrl for img in property_data.images if img.imageUrl]
            main_image = property_data.thumbnail if property_data.thumbnail else (image_urls[0] if image_urls else "")
            gallery = image_urls
        
        # Create UnifiedProperty object
        unified_property = UnifiedProperty(
            id=property_id,
            source=source,
            url=url,
            name=name,
            description=description,
            location=location if location else "",  # Ensure location is never None
            pricing=PricingModel(
                total=float(total.price.replace("$", "").replace(",", "")) if isinstance(total, Price) and total.price else (total if isinstance(total, (int, float)) else 0.0)
            ),
            capacity=CapacityModel(
                bedrooms=bedrooms,
                beds=beds
            ),
            features=FeaturesModel(
                size=None,  # Size information not consistently available
                amenities=amenities
            ),
            media=MediaModel(
                main_image=main_image,
                gallery=gallery
            ),
            score=self._parse_score(evaluation_result.get("score", "0")),
            reasoning=evaluation_result.get("reasoning", ""),
            raw_data=property_data
        )
        
        return unified_property
    
    def _parse_score(self, score_str: str) -> Union[int, float]:
        """Convert a score string to a numeric value (int or float)"""
        try:
            # First try to convert to int
            return int(score_str)
        except ValueError:
            try:
                # If that fails, try to convert to float
                return float(score_str)
            except ValueError:
                # If all conversions fail, return 0
                return 0

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
    # Convert to GeneratedRequirement properly
    if isinstance(generate_requirement, dict):
        generate_requirement = GeneratedRequirement(**generate_requirement)
    else:
        # If it's already a GeneratedRequirement object, use it directly
        generate_requirement = generate_requirement
    
    # Create both Booking and Airbnb agents
    booking_agent = BookingApifyAgent()
    airbnb_agent = AirbnbApifyAgent()
    
    # Get properties from both sources
    booking_request = booking_agent.generate_request(generate_requirement)
    airbnb_request = airbnb_agent.generate_request(generate_requirement)
    
    # Get properties using asyncio.run
    booking_properties = asyncio.run(booking_agent.get_properties(booking_request))
    airbnb_properties = asyncio.run(airbnb_agent.get_properties(airbnb_request))
    
    # Combine properties from both sources
    all_properties = booking_properties + airbnb_properties
    
    # Use the RunnableParallel version
    start_time = time.time()
    evaluate_agent = EvaluateAgent()
    response = asyncio.run(evaluate_agent.evaluate(generate_requirement, all_properties))
    end_time = time.time()
    
    # Check if response is None before calling len()
    if response:
        print(f"Evaluated {len(response)} properties in {end_time - start_time:.2f} seconds")
        for prop in response:
            print(f"Property: {prop.name}, Score: {prop.score}, Source: {prop.source}")
    else:
        print(f"No properties were evaluated in {end_time - start_time:.2f} seconds")