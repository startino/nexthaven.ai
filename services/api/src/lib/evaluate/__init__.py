import logging

from src.models.requirement import GeneratedRequirement
from src.models.booking_apify import BookingApifyResponse
from src.models.airbnb_apify import AirbnbApifyResponse
from src.interfaces.llm import gemini_flash_2

from src.lib.evaluate.image_analysis import AnalyzeImages
from src.lib.evaluate.properites import EvaluateProperties

from langsmith import traceable


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
        analyzed_images = await AnalyzeImages().analyze_images(
            include_images=include_images,
            properties=properties,
            user_request=user_request,
        )

        # Create evaluation tasks for each property
        results = await EvaluateProperties().evaluate_properties(
            properties=properties,
            user_request=user_request,
            analyzed_images=analyzed_images,
        )

        return results
