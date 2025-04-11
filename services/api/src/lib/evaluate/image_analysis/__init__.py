import asyncio, time, logging

from src.models.requirement import GeneratedRequirement
from src.models.booking_apify import BookingApifyResponse
from src.models.airbnb_apify import AirbnbApifyResponse

from langchain_core.messages import HumanMessage
from src.interfaces.llm import gemini_flash_2


class AnalyzeImages:

    def __init__(self):
        self.vision_llm = gemini_flash_2()

    async def analyze_images(
        self,
        include_images: bool,
        properties: list[BookingApifyResponse | AirbnbApifyResponse],
        user_request: GeneratedRequirement,
    ) -> dict[str, str]:
        """
        Process and analyze property images in parallel for multiple properties.

        This function extracts image URLs from different property types (Booking.com and Airbnb),
        analyzes them concurrently using vision models, and returns the analysis results.

        Args:
            include_images: Flag to determine if image analysis should be performed
            properties: List of properties from different sources to analyze
            user_request: User requirements to consider during image analysis

        Returns:
            Dictionary mapping property indices to their image analysis results
        """
        image_analysis = {}

        if include_images:
            image_tasks = []
            for i, prop in enumerate(properties):
                # Handle both Booking.com and Airbnb property types
                if isinstance(prop, BookingApifyResponse) and prop.gallery:
                    image_tasks.append(
                        self._analyze_property_images_with_vision_model(
                            prop.gallery, user_request
                        )
                    )
                elif isinstance(prop, AirbnbApifyResponse) and prop.images:
                    # Extract image URLs from Airbnb images
                    image_urls = [img.imageUrl for img in prop.images if img.imageUrl]
                    if image_urls:
                        image_tasks.append(
                            self._analyze_property_images_with_vision_model(
                                image_urls, user_request
                            )
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
                    image_analysis[f"property_{i}"] = image_results[result_index]
                    result_index += 1
                else:
                    image_analysis[f"property_{i}"] = (
                        "No images available for analysis."
                    )

            end_time = time.time()
            logging.info(
                f"Image analysis completed in {end_time - start_time:.2f} seconds"
            )

        return image_analysis

    async def _analyze_property_images_with_vision_model(
        self,
        image_urls: list[str],
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
                        for url in image_urls
                        if url
                    ],
                ]
            )
        ]

        # Get analysis from vision model
        response = await self.vision_llm.ainvoke(messages)
        return response.content
