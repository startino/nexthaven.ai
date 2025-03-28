import time
import logging
import asyncio
import base64
import httpx
from io import BytesIO
from typing import List, Dict, Any, Union
import openai  # Import for exception handling
import random

from langchain_core.prompts import PromptTemplate, ChatPromptTemplate
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.output_parsers import JsonOutputToolsParser
from langchain_core.runnables import RunnableParallel, RunnableLambda
from langchain_openai import ChatOpenAI

from src.models.requirement import (
    GeneratedRequirement,
    UserRequirement,
    Budget,
    DateRange,
)
from src.models.apify import BookingApifyRequest, BookingApifyResponse
from src.models.airbnb_apify import AirbnbApifyResponse, Price
from src.interfaces.llm import (
    gemini_pro_exp,
    gpt_4o_mini,
    o3_mini,
    gpt_4o,
    o1,
    gemini_flash_2,
    deepseek_r1_distill,
    ministral_8b,
)
from src.lib.scraper.booking_apify import BookingApifyAgent
from src.lib.scraper.airbnb_apify import AirbnbApifyAgent
from src.models.result import Result, Property
from src.lib.evaluate.analyze import AnalyzeUserRequirement
from src.models.unified_property import (
    UnifiedProperty,
    Coordinates,
    PricingModel,
    CapacityModel,
    FeaturesModel,
    MediaModel,
)


class EvaluateAgent:
    def __init__(self):
        self.llm = gpt_4o_mini()
        self.vision_llm = gemini_flash_2()

    async def evaluate(
        self,
        user_request: GeneratedRequirement,
        properties: list[BookingApifyResponse | AirbnbApifyResponse],
        include_images: bool = True,
    ):
        """
        Evaluate properties in parallel using asyncio tasks
        
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
                    image_tasks.append(self._analyze_images(prop.gallery, user_request))
                elif isinstance(prop, AirbnbApifyResponse) and prop.images:
                    # Extract image URLs from Airbnb images
                    image_urls = [img.imageUrl for img in prop.images if img.imageUrl]
                    if image_urls:
                        image_tasks.append(self._analyze_images(image_urls, user_request))
                    else:
                        image_tasks.append(None)
                else:
                    image_tasks.append(None)
                    
            start_time = time.time()

            # Wait for all image analyses to complete
            image_results = await asyncio.gather(
                *[task for task in image_tasks if task is not None]
            )

            # Map results back to properties
            result_index = 0
            for i, task in enumerate(image_tasks):
                if task is not None:
                    image_analyses[f"property_{i}"] = image_results[result_index]
                    result_index += 1
                else:
                    image_analyses[f"property_{i}"] = "No images available for analysis."
                    
            end_time = time.time()
            logging.info(f"Image analysis completed in {end_time - start_time:.2f} seconds")
            
        # Create evaluation tasks for each property
        evaluation_tasks = []
        for i, prop in enumerate(properties):
            property_data = self._simplify_property(prop)
            image_analysis = image_analyses.get(f"property_{i}", "")

            # Remove properties not needed by LLM (to save tokens)
            property_data["gallery"] = []
            property_data["image"] = ""
            property_data["source"] = ""
    
            # Create the task for this property
            task = self._evaluate_single_property(
                property_index=i,
                property_data=property_data,
                image_analysis=image_analysis,
                user_request=user_request
            )
            evaluation_tasks.append(task)
        
        # Process in batches instead of all at once to prevent rate limiting
        logging.info(f"Starting batch processing of {len(properties)} properties")
        start_time = time.time()
        
        # Use a semaphore to limit the total number of concurrent evaluations
        # This prevents overwhelming the API while still allowing parallel batch processing
        max_concurrent_total = 15  # Maximum concurrent evaluations across all batches
        semaphore = asyncio.Semaphore(max_concurrent_total)
        
        # Create a limited version of the evaluation function
        async def limited_evaluation(task):
            async with semaphore:
                return await task
        
        # Process all properties in a more optimized parallel approach
        # Instead of processing batches sequentially, we wrap each task with the semaphore
        # and run all of them in parallel, but with a concurrency limit applied via semaphore
        tasks = [limited_evaluation(task) for task in evaluation_tasks]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        end_time = time.time()
        logging.info(f"Completed parallel evaluation in {end_time - start_time:.2f} seconds")
        
        # Process results
        processed_results: list[UnifiedProperty] = []
        success_count = 0
        error_count = 0
        
        for i, (result, prop) in enumerate(zip(results, properties)):
            try:
                # Check if the result is an exception
                if isinstance(result, Exception):
                    error_count += 1
                    error_message = str(result)
                    
                    # Log different types of errors differently
                    if "Invalid prompt" in error_message or "usage policy" in error_message:
                        logging.warning(f"Content policy violation for property {i}: {error_message[:100]}...")
                    else:
                        logging.error(f"Error evaluating property {i}: {error_message[:100]}...")
                    continue
                
                # Check if result is None (skipped)
                if result is None:
                    error_count += 1
                    logging.warning(f"Property {i} was skipped due to potential issues")
                    continue
                
                # Process the valid result
                success_count += 1

                # Create a UnifiedProperty object
                unified_prop = self._create_unified_property(prop, result)
                processed_results.append(unified_prop)
                
                logging.info(f"Successfully processed property: {unified_prop.name} with score: {unified_prop.score}")
            except Exception as e:
                error_count += 1
                logging.error(f"Error processing property {i}: {str(e)}")
                # Skip this property - don't add it to processed_results

        logging.info(
            f"Evaluation summary: {success_count} successful, {error_count} errors (skipped)"
        )

        # Sort results by score (now using numeric values directly)
        if processed_results:
            sorted_results = sorted(
                processed_results, key=lambda x: x.score, reverse=True
            )

            return sorted_results
        else:
            logging.warning("No properties were successfully processed")
            return []
    
    async def _evaluate_single_property(self, property_index: int, property_data: dict, image_analysis: str, user_request: GeneratedRequirement) -> dict | None:
        """
        Evaluate a single property using LLM
        
        Args:
            property_index: Index of the property
            property_data: Simplified property data
            image_analysis: Analysis of property images
            user_request: User requirements
            
        Returns:
            Evaluation result dict or None if evaluation fails
        """
        try:
            # Create the evaluation prompt with neutral language to avoid policy violations
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
                
                Property: {property_data}
                Image Analysis: {image_analysis}
                
                Pay careful attention to both the Generic Image Analysis (which describes the overall property style and features) and the User Preference-Centric Analysis (which specifically examines how well the property matches the user's stated preferences). Use insights from both analyses when evaluating how well the property aligns with the user's requirements, especially regarding style and feel.
                
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
            
            # Create the evaluation chain
            chain = (
                prompt 
                | self.llm.bind_tools([Result], tool_choice="any") 
                | JsonOutputToolsParser(return_id=True)
            )
            
            # Execute with 30 second timeout to meet our target
            try:
                result = await asyncio.wait_for(
                    chain.ainvoke({}), 
                    timeout=30 # Reduced to 30s target
                )
                
                logging.info(f"Successfully evaluated property {property_index}")
                
                # Extract the result args
                if not result or not isinstance(result, list) or not result[0].get("args"):
                    logging.error(f"Unexpected result format for property {property_index}: {result}")
                    return None
                
                return result[0]["args"]
                
            except asyncio.TimeoutError:
                logging.warning(f"Evaluation of property {property_index} timed out after 30 seconds")
                return None
                
        except openai.BadRequestError as e:
            # Handle content policy violations
            error_message = str(e)
            content_policy_patterns = [
                "invalid prompt", 
                "usage policy", 
                "content policy", 
                "violating", 
                "error code: 400",
                "invalid_request_error"
            ]
            
            # Check if any content policy pattern is in the error message (case insensitive)
            if any(pattern.lower() in error_message.lower() for pattern in content_policy_patterns):
                logging.warning(f"Content policy violation detected for property {property_index}, skipping")
                return None  # Return None to skip this property instead of raising
            
            # For other OpenAI API errors, log and return None to continue with other properties
            logging.error(f"OpenAI API error for property {property_index}: {error_message}")
            return None
                
        except Exception as e:
            # Log any other exception but don't halt the entire process
            logging.error(f"Unexpected error evaluating property {property_index}: {str(e)}")
            return None
    
    async def _analyze_images(self, image_urls: List[str], user_request: GeneratedRequirement, max_images: int = 15) -> str:
        """
        Analyze property images using vision model - combined generic and preference analysis
        
        Args:
            image_urls: List of image URLs to analyze
            user_request: User's requirements to consider for preference-centric analysis
            max_images: Maximum number of images to analyze
            
        Returns:
            String containing combined image analysis
        """
        if not image_urls:
            return "No images available for analysis."

        # Randomly select images up to max_images
        # We select them randomly as the order of images is likely to be grouped by things like room, bathroom, nearby attractions, etc.
        if len(image_urls) > max_images:
            selected_urls = random.sample(image_urls, max_images)
        else:
            selected_urls = image_urls.copy()
            
        # Extract user preferences for the prompt
        preferences_text = "Not specified"
        if user_request and user_request.preferences:
            preferences_text = user_request.preferences
            
        # Create a combined prompt that addresses both generic and preference-specific analysis
        combined_messages = [
            HumanMessage(
                content=[
                    {
                        "type": "text",
                        "text": f"""Analyze these property images comprehensively in two parts:

PART 1 - GENERIC ANALYSIS:
Describe the style, vibe, and aesthetic of the property. Focus on decor, design elements, ambiance, and overall feel. Is it modern, traditional, minimalist, luxurious, cozy, etc.? What are the key visual features of this property?

PART 2 - USER PREFERENCE MATCH:
The user has specified these preferences: '{preferences_text}'
Analyze if the property matches these specific preferences. Which visual elements align with or contradict the user's stated preferences?
Be highly descriptive and specifc about the details found in the images; it's like you're making the image come to life through your analysis.
If the images don't contain the information to make a determination, say "Images don't contain information to make a determination for [insert preference here]"

Please provide a detailed, thorough analysis of both aspects, clearly separating the two parts in your response.
""",
                    },
                    *[
                        {"type": "image_url", "image_url": {"url": url}}
                        for url in selected_urls
                        if url
                    ],
                ]
            )
        ]

        # Get combined analysis from vision model
        response = await self.vision_llm.ainvoke(combined_messages)
        
        # Format the response
        combined_analysis = f"""Image Analysis: {response.content}"""
        return combined_analysis

    def _simplify_property(
        self, property_data: BookingApifyResponse | AirbnbApifyResponse
    ) -> Dict[str, Any]:
        """Convert ApifyResponse to a simplified dictionary for the LLM"""
        if isinstance(property_data, BookingApifyResponse):
            return self._simplify_booking_property(property_data)
        elif isinstance(property_data, AirbnbApifyResponse):
            return self._simplify_airbnb_property(property_data)
        else:
            raise ValueError(f"Unsupported property type: {type(property_data)}")

    def _simplify_booking_property(
        self, property_data: BookingApifyResponse
    ) -> Dict[str, Any]:
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
            scores = [
                review.score
                for review in property_data.categoryReviews
                if review.score is not None
            ]
            if scores:
                avg_score = sum(scores) / len(scores)

        result = {
            "name": property_data.name,
            "url": property_data.url,
            "price": property_data.price,
            "location": property_data.address.full if property_data.address else "",
            "rooms": len(property_data.rooms) if property_data.rooms else 0,
            "amenities": amenities[:10],
            "reviews": [
                {"title": review.title, "score": review.score}
                for review in property_data.categoryReviews[:5]
                if review.title
            ],
            "score": f"{avg_score:.1f}/10" if avg_score else "No reviews",
            "image": property_data.image,
            "description": property_data.description,
            "gallery": property_data.gallery,
            "source": "booking",
        }

        return result

    def _simplify_airbnb_property(
        self, property_data: AirbnbApifyResponse
    ) -> Dict[str, Any]:
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
        main_image = (
            property_data.thumbnail
            if property_data.thumbnail
            else (image_urls[0] if image_urls else "")
        )

        # Extract price
        price_value = None
        if property_data.price and property_data.price.price:
            # Try to extract numeric value from price string
            try:
                price_str = property_data.price.price
                price_value = float(
                    "".join(filter(lambda x: x.isdigit() or x == ".", price_str))
                )
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
            "source": "airbnb",
        }

        return result

    def _create_unified_property(
        self,
        property_data: BookingApifyResponse | AirbnbApifyResponse,
        evaluation_result: Dict[str, Any],
    ) -> UnifiedProperty:
        """Convert property data and evaluation result to a UnifiedProperty object"""
        # Determine source
        source = (
            "Booking.com"
            if isinstance(property_data, BookingApifyResponse)
            else "Airbnb"
        )

        # Extract property ID
        if isinstance(property_data, BookingApifyResponse):
            property_id = str(
                hash(property_data.url)
            )  # Generate ID from URL for Booking.com
            name = property_data.name
            description = property_data.description
            url = property_data.url
            location = property_data.address.full if property_data.address else ""
            coordinates = property_data.location if property_data.location else ""

            # Extract pricing
            if isinstance(property_data.price, str):
                total = float(property_data.price.replace("$", "").replace(",", ""))
            else:
                total = property_data.price

            # Extract capacity
            bedrooms = len(property_data.rooms) if property_data.rooms else 1
            beds = (
                sum(room.persons or 1 for room in property_data.rooms)
                if property_data.rooms
                else 1
            )

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
            coordinates = property_data.coordinates if property_data.coordinates else ""

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
            main_image = (
                property_data.thumbnail
                if property_data.thumbnail
                else (image_urls[0] if image_urls else "")
            )
            gallery = image_urls

        # Create UnifiedProperty object
        unified_property = UnifiedProperty(
            id=property_id,
            source=source,
            url=url,
            name=name,
            description=description,
            location=location if location else "",  # Ensure location is never None
            coordinates=Coordinates(lat=coordinates.lat, lng=coordinates.lng) if coordinates else Coordinates(lat=None, lng=None),
            pricing=PricingModel(
                total=(
                    float(total.price.replace("$", "").replace(",", ""))
                    if isinstance(total, Price) and total.price
                    else (total if isinstance(total, (int, float)) else 0.0)
                )
            ),
            capacity=CapacityModel(bedrooms=bedrooms, beds=beds),
            features=FeaturesModel(
                size=None,  # Size information not consistently available
                amenities=amenities,
            ),
            media=MediaModel(main_image=main_image, gallery=gallery),
            score=self._parse_score(evaluation_result.get("score", "0")),
            reasoning=evaluation_result.get("reasoning", ""),
            raw_data=property_data,
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
        preferences="I want a property with a pool, quiet location, a good view, proximity to co-working space",
    )

    generate_requirement = AnalyzeUserRequirement().analyze_user_requirement(
        user_request
    )
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
    
    # Use the asyncio version
    async def main():
        start_time = time.time()
        evaluate_agent = EvaluateAgent()
        try:
            response = await evaluate_agent.evaluate(generate_requirement, all_properties)
        finally:
            # Ensure resources are cleaned up
            await evaluate_agent.close()
        end_time = time.time()

        # Check if response is None before calling len()
        if response:
            print(
                f"Evaluated {len(response)} properties in {end_time - start_time:.2f} seconds"
            )
            for prop in response:
                print(f"Property: {prop.name}, Score: {prop.score}, Source: {prop.source}")
        else:
            print(f"No properties were evaluated in {end_time - start_time:.2f} seconds")
    
    # Run the async main function
    asyncio.run(main())
