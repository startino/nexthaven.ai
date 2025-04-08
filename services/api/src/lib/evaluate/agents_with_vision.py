import math
import time
import logging
import asyncio
import base64
import httpx
from io import BytesIO
from typing import List, Dict, Any, Union
import openai  # Import for exception handling
import random
import os

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

from langsmith import traceable
from pydantic import BaseModel, Field


class NightlyPriceOutput(BaseModel):
    """Output model for nightly price calculation"""

    price: float = Field(description="The calculated nightly price")


class EvaluateAgent:
    def __init__(self):
        self.llm = gemini_flash_2()
        self.vision_llm = gemini_flash_2()

    @traceable(run_type="llm")
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
                        image_tasks.append(
                            self._analyze_images(image_urls, user_request)
                        )
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
                    image_analyses[f"property_{i}"] = (
                        "No images available for analysis."
                    )

            end_time = time.time()
            logging.info(
                f"Image analysis completed in {end_time - start_time:.2f} seconds"
            )

        # Create evaluation tasks for each property
        evaluation_tasks = []
        for i, prop in enumerate(properties):
            property_data = self._simplify_property(prop)
            image_analysis = image_analyses.get(f"property_{i}", "")

            # Remove properties not needed by LLM (to save tokens)
            property_data["gallery"] = []
            property_data["image"] = ""
            property_data["source"] = ""
            property_data["price"] = ""
            property_data["name"] = ""

            # Create the task for this property
            task = self._evaluate_single_property(
                property_index=i,
                property_data=property_data,
                image_analysis=image_analysis,
                user_request=user_request,
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
        logging.info(
            f"Completed parallel evaluation in {end_time - start_time:.2f} seconds"
        )

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
                    if (
                        "Invalid prompt" in error_message
                        or "usage policy" in error_message
                    ):
                        logging.warning(
                            f"Content policy violation for property {i}: {error_message[:100]}..."
                        )
                    else:
                        logging.error(
                            f"Error evaluating property {i}: {error_message[:100]}..."
                        )
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

                logging.info(
                    f"Successfully processed property: {unified_prop.name} with score: {unified_prop.score}"
                )
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

    async def _evaluate_single_property(
        self,
        property_index: int,
        property_data: dict,
        image_analysis: str,
        user_request: GeneratedRequirement,
    ) -> Result | None:
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
                Evaluate this property against the user's requirements and preferences and return a match score and analysis.
                
                #### PROPERTY ####
                {property_data}
                
                #### IMAGE ANALYSIS ####
                {image_analysis}
                
                #### USER REQUIREMENTS ####
                {user_request}
                
                Pay careful attention to both the Generic Image Analysis (which describes the overall property style and features) and the User Preference-Centric Analysis (which specifically examines how well the property matches the user's stated preferences). Use insights from both analyses when evaluating how well the property aligns with the user's requirements, especially regarding style and feel.
                
                Return a property match with a score between 0-100 where 100 is a perfect match.
                Weight the scores towards these numbers: 98%, 85%, 75%, 65%, 55%, 45%, 35%
                Your score output should be just the number, no other text.

                Return your evaluation Result in the exact JSON format:
                {{
                    "reasoning": <reasoning; detailed reasoning behind the score, explaining to the user why the property matches or doesn't match the their preferences>,
                    "score": <score; number from 1 to 100>
                }}
                Write your reasoning first. Then provide the score.

                You are forbidden from scoring a property a 0, at least give it a 1.
                
                You do not need to touch on the price aspect.
                Some attributes like price and name have been redacted so that they don't affect your reasoning.

                You must provide detailed reasoning for your score, explaining to the user why the property matches or doesn't match the their preferences.
                This reasoning will be shown to the user to help them understand why this property received its score.
                Be specific about which preferences were met and which weren't.
                Start your reasoning with the leanest, most concise summary of the evaluation, addressing the most important preferences succinctly.
                Format this as a list of sentences, with emojis for each item, in HTML format. Only use <p>, <strong>, tags.
                Make the emojis relevant to the item (for location, use a map emoji, 📌 for summary, etc.) and scoring of that attribute.
                Don't use thumbsup, thumsdown, checkmark, or any generic emojis.
                Don't use "-" or "•" or "*" or any other bullet point.
                Use a colon ":" to separate the item and the score.
                Each item should be on a new line.

                Start with their most unique and important preferences.
                Don't give a summary. Don't repeat the same items.

                For individual item ratings, score them out of 10 and format it as `<strong><emoji> <item>: <score>/10 </strong> - <explanation>`
                """
                    ),
                    HumanMessage(
                        content=f"""Hey man! I'm excited to be here with you! I can't wait for you to help me find the perfect short-term rental for me! Here are my imaginary requirements: {str(user_request)}"""
                    ),
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
                    chain.ainvoke({}), timeout=30  # Reduced to 30s target
                )

                logging.info(f"Successfully evaluated property {property_index}")

                # Extract the result args
                if (
                    not result
                    or not isinstance(result, list)
                    or not result[0].get("args")
                ):
                    logging.error(
                        f"Unexpected result format for property {property_index}: {result}"
                    )
                    return None

                # Convert the result to a Result object
                result_obj = Result(**result[0]["args"])

                return result_obj

            except asyncio.TimeoutError:
                logging.warning(
                    f"Evaluation of property {property_index} timed out after 30 seconds"
                )
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
                "invalid_request_error",
            ]

            # Check if any content policy pattern is in the error message (case insensitive)
            if any(
                pattern.lower() in error_message.lower()
                for pattern in content_policy_patterns
            ):
                logging.warning(
                    f"Content policy violation detected for property {property_index}, skipping"
                )
                return None  # Return None to skip this property instead of raising

            # For other OpenAI API errors, log and return None to continue with other properties
            logging.error(
                f"OpenAI API error for property {property_index}: {error_message}"
            )
            return None

        except Exception as e:
            # Log any other exception but don't halt the entire process
            logging.error(
                f"Unexpected error evaluating property {property_index}: {str(e)}"
            )
            return None

    async def _analyze_images(
        self,
        image_urls: List[str],
        user_request: GeneratedRequirement,
        max_images: int = 15,
    ) -> str:
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

        # Extract user preferences for the prompt
        preferences_text = "Not specified"
        if user_request and user_request.preferences:
            preferences_text = user_request.preferences

        # Create a combined prompt that addresses both generic and preference-specific analysis
        messages = [
            HumanMessage(
                content=[
                    {
                        "type": "text",
                        "text": f"""Analyze these property images comprehensively in two parts:

PART 1 - GENERIC ANALYSIS:

#### GENERAL INSTRUCTIONS ####
- Touch on each image, room, and area of the property available.
- Label each image with the room or area it is from.
- In your response, for each extracted item, cite which image it is from.
- Describe the property in its entirety.
- Be highly descriptive and specifc about the details found in the images
- It's like you're making the image come to life through your analysis.
- These are the aspects to focus on:
  - Vibe, design, and aesthetic; Is it modern, traditional, minimalist, luxurious, cozy, etc.?
  - Decor, design elements, and ambiance; Furniture, art, and other decor elements that set the tone.
  - Size; focus on size (default to square meters if not specified)
- Complete with a summary of the property.
  - Include the sizes of the rooms, noting if a room should be considered in the property's total size.
  - For example, we shouldn't consider a lobby or elevator in the total size.

#### SIZE ####
Work step by step as follows:
1. **Identify reference objects with known real-world dimensions.**  
   - Prioritize beds, doors, tables, chairs, or TVs.
   - Assume a king-size bed is approximately 2 meters wide and 2 meters long.
   - Assume a standard door is about 2 meters tall and 0.8–0.9 meters wide.
2. **Estimate spatial gaps around reference objects.**  
   - Estimate walking space on either side of the bed (usually around 0.7–0.8 meters).
   - Estimate distance from the foot of the bed to the nearest furniture or wall (usually around 1.2–1.5 meters in hotel rooms).
3. **Estimate total room dimensions.**  
   - Width = bed width + left walking space + right walking space.
   - Length = bed length + space in front of the bed + space at the headboard side.
4. **Calculate the area in square meters.**  
   - Multiply width x length.
5. **Cross-check with typical hotel room sizes.**  
   - Compare your estimate to common hotel room standards (e.g., compact hotel rooms: 18–22 m²).
6. **Optional sanity check:**  
   - Look at furniture scale, wall spacing, or ceiling height if visible.
   - Avoid exaggeration based on wide-angle lens distortion.

Finally, provide your estimated room size in square meters, and explain your assumptions and rough error margin (e.g., ± 2 m²).”

PART 2 - USER PREFERENCE MATCH:
The user has specified these preferences: '{preferences_text}'
Analyze if the property matches these specific preferences. Which visual elements align with or contradict the user's stated preferences?
Be highly descriptive and specifc about the details found in the images; it's like you're making the image come to life through your analysis.
If the images don't contain the information to make a determination, say "Images don't contain information to make a determination for [insert preference here]"

Please provide a detailed, thorough analysis of both aspects, clearly separating the two parts in your response.

You are not responsible for evaluating and matching the property.
You are simply responsible for describing the property in its entirety.
""",
                    },
                    *[
                        {"type": "image_url", "image_url": {"url": url}}
                        for url in image_urls # We are now sending all images, not a limited list anymore.
                        if url
                    ],
                ]
            )
        ]

        # Get analysis from vision model
        response = await self.vision_llm.ainvoke(messages)
        return response.content

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

        # More robust checks for check-in/out dates
        check_in_value = None
        check_out_value = None

        # Use validated date format with fallbacks
        if property_data.checkIn and self._is_valid_date_format(property_data.checkIn):
            check_in_value = property_data.checkIn
        else:
            # Use fallback values
            check_in_value = os.getenv("DEFAULT_CHECK_IN_DATE", "2025-04-01")

        if property_data.checkOut and self._is_valid_date_format(
            property_data.checkOut
        ):
            check_out_value = property_data.checkOut
        else:
            # Use fallback values
            check_out_value = os.getenv("DEFAULT_CHECK_OUT_DATE", "2025-04-05")

        result = {
            "name": property_data.name,
            "url": property_data.url,
            "price": property_data.price,
            "price_type": "total",  # Indicate this is a total price
            "source": "Booking.com",  # Explicitly mark the source with consistent name
            "check_in": check_in_value,  # Include check-in date
            "check_out": check_out_value,  # Include check-out date
            "location": property_data.address.full if property_data.address else "",
            "rooms": len(property_data.rooms) if property_data.rooms else 0,
            "amenities": amenities[:10],
            "reviews": [
                {"title": review.title, "score": review.score}
                for review in property_data.categoryReviews
                if review.title
            ],
            "image": property_data.image,
            "description": property_data.description,
            "gallery": property_data.gallery,
        }

        # For Booking.com, convert total price to nightly price
        # Calculate number of nights from check-in/check-out
        if result["price"] is not None:
            try:
                from datetime import datetime

                # Get check-in and check-out with validation
                check_in_value = None
                check_out_value = None

                if property_data.checkIn and self._is_valid_date_format(
                    property_data.checkIn
                ):
                    check_in_value = property_data.checkIn
                else:
                    # Use fallback values
                    check_in_value = os.getenv("DEFAULT_CHECK_IN_DATE", "2025-04-01")

                if property_data.checkOut and self._is_valid_date_format(
                    property_data.checkOut
                ):
                    check_out_value = property_data.checkOut
                else:
                    # Use fallback values
                    check_out_value = os.getenv("DEFAULT_CHECK_OUT_DATE", "2025-04-05")

                check_in_date = datetime.strptime(check_in_value, "%Y-%m-%d")
                check_out_date = datetime.strptime(check_out_value, "%Y-%m-%d")
                nights = (check_out_date - check_in_date).days

                if nights > 0:
                    # Convert to nightly price
                    result["price"] = result["price"] / nights
                    # Apply discount adjustment for long stays
                    if nights >= 28:
                        # Long stay, might have monthly pricing
                        result["price"] = (
                            result["price"] * 0.9
                        )  # Simple adjustment for monthly discounts
                    elif nights >= 7:
                        # Weekly stay, might have minor discount
                        result["price"] = (
                            result["price"] * 0.95
                        )  # Simple adjustment for weekly discounts
                else:
                    logging.warning(
                        f"Invalid night count {nights} in _simplify_booking_property"
                    )
            except Exception as e:
                logging.warning(
                    f"Error calculating nightly price from dates in _simplify_booking_property: {e}"
                )

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
                logging.error(f"Error extracting price from {price_str}")
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
            "image": main_image,
            "description": property_data.description,
            "gallery": image_urls,
            "source": "airbnb",
        }

        # For Booking.com, convert total price to nightly price
        # Calculate number of nights from check-in/check-out
        if (
            property_data.checkIn
            and property_data.checkOut
            and result["price"] is not None
        ):
            try:
                from datetime import datetime

                # Get check-in and check-out with validation
                check_in_value = None
                check_out_value = None

                if property_data.checkIn and self._is_valid_date_format(
                    property_data.checkIn
                ):
                    check_in_value = property_data.checkIn
                else:
                    # Use fallback values
                    check_in_value = os.getenv("DEFAULT_CHECK_IN_DATE", "2025-04-01")

                if property_data.checkOut and self._is_valid_date_format(
                    property_data.checkOut
                ):
                    check_out_value = property_data.checkOut
                else:
                    # Use fallback values
                    check_out_value = os.getenv("DEFAULT_CHECK_OUT_DATE", "2025-04-05")

                check_in_date = datetime.strptime(check_in_value, "%Y-%m-%d")
                check_out_date = datetime.strptime(check_out_value, "%Y-%m-%d")
                nights = (check_out_date - check_in_date).days

                if nights > 0:
                    # Convert to nightly price
                    result["price"] = result["price"] / nights
                    # Apply discount adjustment for long stays
                    if nights >= 28:
                        # Long stay, might have monthly pricing
                        result["price"] = (
                            result["price"] * 0.9
                        )  # Simple adjustment for monthly discounts
                    elif nights >= 7:
                        # Weekly stay, might have minor discount
                        result["price"] = (
                            result["price"] * 0.95
                        )  # Simple adjustment for weekly discounts
                else:
                    logging.warning(
                        f"Invalid night count {nights} in _simplify_airbnb_property"
                    )
            except Exception as e:
                logging.warning(f"Error calculating nightly price from dates: {e}")

        return result

    async def _convert_booking_price_with_llm(self, property_data, total_price):
        """
        Uses LLM to intelligently convert Booking.com's total price to nightly price
        considering all pricing factors (discounts, duration, etc).

        Args:
            property_data: The BookingApifyResponse object
            total_price: The total price for the entire stay

        Returns:
            Calculated nightly price
        """
        # Calculate basic duration information for context
        nights = 1  # Default fallback

        # Debug log to check property_data attributes
        logging.info(
            f"CheckIn type: {type(property_data)}, has checkIn: {hasattr(property_data, 'checkIn')}"
        )
        logging.info(f"CheckIn value: {getattr(property_data, 'checkIn', 'NOT FOUND')}")
        logging.info(
            f"CheckOut value: {getattr(property_data, 'checkOut', 'NOT FOUND')}"
        )

        # More robust checks for check-in/out dates
        check_in_value = None
        check_out_value = None

        # Use validated date format with fallbacks
        if property_data.checkIn and self._is_valid_date_format(property_data.checkIn):
            check_in_value = property_data.checkIn
        else:
            # Use fallback values
            check_in_value = os.getenv("DEFAULT_CHECK_IN_DATE", "2025-04-01")

        if property_data.checkOut and self._is_valid_date_format(
            property_data.checkOut
        ):
            check_out_value = property_data.checkOut
        else:
            # Use fallback values
            check_out_value = os.getenv("DEFAULT_CHECK_OUT_DATE", "2025-04-05")

        # If dates are found, calculate nights
        if check_in_value and check_out_value:
            try:
                from datetime import datetime

                logging.info(
                    f"Found dates - CheckIn: {check_in_value}, CheckOut: {check_out_value}"
                )
                check_in = datetime.strptime(check_in_value, "%Y-%m-%d")
                check_out = datetime.strptime(check_out_value, "%Y-%m-%d")
                nights = (check_out - check_in).days
                logging.info(f"Calculated nights: {nights}")

                if nights <= 0:
                    logging.warning(
                        f"Invalid nights calculation: {nights}, defaulting to 1"
                    )
                    nights = 1
            except Exception as e:
                logging.warning(f"Error calculating nights from dates: {e}")
        else:
            logging.warning(
                f"Missing check-in/out dates. Using default nights value: {nights}"
            )

        # Ensure nights is at least 1 to avoid division by zero
        nights = max(1, nights)

        # Create a prompt for the LLM
        prompt = PromptTemplate.from_template(
            """You are an expert vacation rental pricing analyst with deep knowledge of global pricing trends.
            
            ## PROPERTY DETAILS:
            - Property name: {name}
            - Description: {description_snippet}
            - Total price: ${total_price} for {nights} nights
            - Check-in: {check_in}
            - Check-out: {check_out}
            - Property type: {property_type}
            - Location: {location}
            - Number of rooms: {room_count}
            - Has reviews: {has_reviews}
            
            ## TASK:
            Calculate a REALISTIC nightly price for this Booking.com property.
            
            ## CONSIDERATIONS:
            
            ### 1. LOCATION FACTORS:
               - Typical hotel/accommodation prices per night in major cities:
                 * New York: Budget $100-180, Standard $180-350, Luxury $350-800+
                 * London: Budget $90-160, Standard $160-320, Luxury $320-750+
                 * Paris: Budget $80-150, Standard $150-300, Luxury $300-700+
                 * Tokyo: Budget $70-140, Standard $140-280, Luxury $280-650+
                 * Miami: Budget $80-150, Standard $150-300, Luxury $300-700+
               - Research typical pricing in this specific location/neighborhood
               - Consider proximity to attractions, transit, business districts
            
            ### 2. TEMPORAL FACTORS:
               - Weekend vs weekday rate differences (weekends typically 10-40% higher)
               - Seasonal demand (high season can be 25-100% more expensive)
               - Holiday/event premiums (can increase rates 50-200%)
               - Length-of-stay discounts (weekly ~10-15%, monthly ~25-40%)
            
            ### 3. PROPERTY FACTORS:
               - Property type and size impact on pricing
               - Star rating and quality level
               - Amenities that might justify premium pricing
            
            ### 4. REALITY CHECK:
               - Simple division gives: ${total_price} ÷ {nights} = ${per_night_price:.2f}/night
               - Does this price make sense for this property type in this location?
               - If the simple division price seems unrealistic, estimate a more realistic price
               - Most hotels (except ultra-luxury) rarely exceed $800/night in major cities
            
            ## EXAMPLES:
            
            ### Example 1: Standard Hotel in New York
            - Total price: $1200 for 4 nights
            - Simple division: $300/night
            - Realistic price: $285/night (after accounting for Sunday at lower rate)
            
            ### Example 2: Luxury Resort in Miami Beach
            - Total price: $3500 for 7 nights
            - Simple division: $500/night
            - Realistic price: $550/night (weekend nights priced higher, offsetting weekly discount)
            
            ### Example 3: Budget Accommodation in London
            - Total price: $900 for 6 nights
            - Simple division: $150/night
            - Realistic price: $145/night (weekly discount applied)
            
            ### Example 4: Extended Stay Apartment in Paris
            - Total price: $4200 for 30 nights
            - Simple division: $140/night
            - Realistic price: $170/night (monthly discount already applied to total, actual nightly rate higher)
            
            Return ONLY a single numeric value representing the most realistic nightly price in USD - no explanation or text.
            """
        )

        # Create the chain with structured output
        chain = (
            prompt
            | gpt_4o_mini(0).bind_tools([NightlyPriceOutput], tool_choice="any")
            | JsonOutputToolsParser(return_id=True)
        )

        # Invoke the chain
        try:
            # Prepare the input with detailed context
            chain_input = {
                "total_price": total_price,
                "nights": nights,
                "check_in": property_data.checkIn or "Unknown",
                "check_out": property_data.checkOut or "Unknown",
                "property_type": property_data.type or "Accommodation",
                "location": (
                    property_data.address.full
                    if property_data.address
                    else "Unknown location"
                ),
                # Add more context for better analysis
                "name": (
                    property_data.name[:100] if hasattr(property_data, "name") else ""
                ),
                "description_snippet": (
                    property_data.description[:200]
                    if hasattr(property_data, "description")
                    else ""
                ),
                "room_count": (
                    len(property_data.rooms)
                    if hasattr(property_data, "rooms") and property_data.rooms
                    else 1
                ),
                "has_reviews": (
                    bool(property_data.categoryReviews)
                    if hasattr(property_data, "categoryReviews")
                    else False
                ),
                # Calculate the per night price to avoid template calculation issues
                # Using max(1, nights) to ensure we never divide by zero
                "per_night_price": (
                    total_price / max(1, nights) if nights > 0 else total_price
                ),
            }

            # Get the calculated price with structured output
            response = await chain.ainvoke(chain_input)

            # Extract the price from the structured output
            try:
                if response and isinstance(response, list) and len(response) > 0:
                    calculated_price = float(response[0]["args"]["price"])

                    # Enhanced logging with more details about the calculation
                    logging.info(
                        f"Price calculation for {property_data.name[:30]}... in {chain_input['location'][:30]}...:"
                        + f"\n  Original total: ${chain_input['total_price']:.2f} for {chain_input['nights']} nights"
                        + f"\n  Calculated nightly: ${calculated_price:.2f}"
                        + f"\n  Simple division: ${chain_input['total_price']/max(1,chain_input['nights']):.2f}"
                        + f"\n  Diff from simple division: {(calculated_price - chain_input['total_price']/max(1,chain_input['nights']))/max(0.01, chain_input['total_price']/max(1,chain_input['nights']))*100:.1f}%"
                    )

                    return calculated_price
                else:
                    # Fall back to simple division if response format is unexpected
                    logging.warning(
                        "Unexpected response format from LLM, falling back to simple calculation"
                    )
                    return total_price / nights
            except (KeyError, ValueError, TypeError) as e:
                # If we can't parse the price, fall back to simple division
                logging.warning(
                    f"Error extracting price from LLM response: {e}, falling back to simple calculation"
                )
                return total_price / nights

        except Exception as e:
            logging.error(f"Error in LLM price calculation: {e}")
            # Fall back to simple division if LLM fails
            return total_price / nights

    def _create_unified_property(
        self,
        property_data: BookingApifyResponse | AirbnbApifyResponse,
        evaluation_result: Result,
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
            coordinates: Coordinates = Coordinates(
                lat=property_data.location.lat, lng=property_data.location.lng
            )

            # Extract pricing
            if isinstance(property_data.price, str):
                total = float(property_data.price.replace("$", "").replace(",", ""))
            else:
                total = property_data.price

            # For Booking.com, convert total price to nightly price using LLM chain
            if source == "Booking.com" and total:
                # Use LLM to calculate nightly price considering all factors
                import asyncio

                try:
                    loop = asyncio.get_event_loop()
                    # Store original price for logging
                    original_price = total

                    # Handle both running and non-running event loop cases
                    if not loop.is_running():
                        # If no loop is running, we can use run_until_complete
                        total = loop.run_until_complete(
                            self._convert_booking_price_with_llm(property_data, total)
                        )
                    else:
                        # If a loop is already running, we need a different approach
                        import concurrent.futures
                        import functools

                        # Create a function that wraps our async LLM call in a new event loop
                        def run_in_new_loop(property_data, price):
                            # Create a new event loop in this thread
                            new_loop = asyncio.new_event_loop()
                            asyncio.set_event_loop(new_loop)
                            try:
                                # Run the async function in the new loop
                                return new_loop.run_until_complete(
                                    self._convert_booking_price_with_llm(
                                        property_data, price
                                    )
                                )
                            finally:
                                new_loop.close()

                        # Run the function in a ThreadPoolExecutor
                        with concurrent.futures.ThreadPoolExecutor() as executor:
                            future = executor.submit(
                                run_in_new_loop, property_data, total
                            )
                            # Wait for and get the result
                            total = future.result()

                    # Log the price change
                    if abs(original_price - total) > 0.01:
                        logging.warning(
                            f"LLM PRICE CHANGE: ${original_price:.2f} → ${total:.2f}"
                        )
                except Exception as e:
                    logging.error(f"Error calculating nightly price with LLM: {e}")
                    # Fall back to simple division if the LLM fails

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
            coordinates: Coordinates = Coordinates(
                lat=property_data.coordinates.latitude,
                lng=property_data.coordinates.longitude,
            )

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
            coordinates=(
                Coordinates(lat=coordinates.lat, lng=coordinates.lng)
                if coordinates
                else Coordinates(lat=None, lng=None)
            ),
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
            score=self._parse_score(evaluation_result.score),
            reasoning=evaluation_result.reasoning,
            raw_data=property_data,
        )

        return unified_property

    def _parse_score(self, score_str: int | str | None) -> int:
        """Handle the parsing and error handling of the score from evaluation result"""
        if score_str is None:
            logging.error(f"Score didn't exist in evaluation result")
            return 999
        try:
            # First try to convert to int
            return int(score_str)
        except ValueError:
            try:
                # If that fails, try to convert to float
                return int(math.floor(float(score_str)))
            except ValueError:
                # If all conversions fail, return 999 (error)
                logging.error(f"Error parsing score: {score_str}")
                return 999

    def _is_valid_date_format(self, date_str: str) -> bool:
        """
        Check if a string is in the YYYY-MM-DD date format.

        Args:
            date_str: String to check

        Returns:
            bool: True if string follows the YYYY-MM-DD format, False otherwise
        """
        if not date_str or not isinstance(date_str, str):
            return False

        # Check if it follows YYYY-MM-DD pattern
        import re

        if not re.match(r"^\d{4}-\d{2}-\d{2}$", date_str):
            return False

        # Additional validation to make sure it's a valid date
        try:
            from datetime import datetime

            datetime.strptime(date_str, "%Y-%m-%d")
            return True
        except ValueError:
            return False


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
            response = await evaluate_agent.evaluate(
                generate_requirement, all_properties
            )
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
                print(
                    f"Property: {prop.name}, Score: {prop.score}, Source: {prop.source}"
                )
        else:
            print(
                f"No properties were evaluated in {end_time - start_time:.2f} seconds"
            )

    # Run the async main function
    asyncio.run(main())
