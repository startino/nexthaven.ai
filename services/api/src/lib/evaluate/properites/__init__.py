import logging, asyncio, openai, time
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputToolsParser
from src.models.requirement import GeneratedRequirement
from src.models.result import Result
from src.models.booking_apify import BookingApifyResponse
from src.models.airbnb_apify import AirbnbApifyResponse
from src.models.unified_property import UnifiedProperty

from src.interfaces.llm import gemini_flash_2
from src.lib.evaluate.properites.unify_properties import UnifyProperties
from src.lib.evaluate.properites.simplify_property import SimplifyProperty


class EvaluateProperties:
    def __init__(self):
        self.llm = gemini_flash_2()
        self.max_concurrent_total = 15
        self.evaluation_timeout = 30
        self.unify_properties = UnifyProperties()
        self.simplify_property = SimplifyProperty()

    async def evaluate_properties(
        self,
        properties: list[BookingApifyResponse | AirbnbApifyResponse],
        user_request: GeneratedRequirement,
        analyzed_images: dict[str, str],
    ):
        """Evaluate multiple properties in parallel and return sorted results"""
        evaluation_tasks = []
        for i, prop in enumerate(properties):
            property_data = self.simplify_property(prop)
            image_analysis = analyzed_images.get(f"property_{i}", "")

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

        logging.info(f"Starting batch processing of {len(properties)} properties")
        # Use a semaphore to limit the total number of concurrent evaluations
        semaphore = asyncio.Semaphore(self.max_concurrent_total)

        # Create a limited version of the evaluation function
        async def limited_evaluation(task):
            async with semaphore:
                return await task

        start_time = time.time()

        # Process all properties in a more optimized parallel approach
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

                # Create a UnifiedProperty object using the new UnifyProperties class
                unified_prop = self.unify_properties.create_unified_property(
                    prop, result, user_request
                )
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

            chain = (
                prompt
                | self.llm.bind_tools([Result], tool_choice="any")
                | JsonOutputToolsParser(return_id=True)
            )

            # Execute with timeout to meet our target
            try:
                result = await asyncio.wait_for(
                    chain.ainvoke({}), timeout=self.evaluation_timeout
                )

                logging.info(f"Successfully evaluated property {property_index}")

                if (
                    not result
                    or not isinstance(result, list)
                    or not result[0].get("args")
                ):
                    logging.error(
                        f"Unexpected result format for property {property_index}: {result}"
                    )
                    return None

                result_obj = Result(**result[0]["args"])

                return result_obj

            except asyncio.TimeoutError:
                logging.warning(
                    f"Evaluation of property {property_index} timed out after {self.evaluation_timeout} seconds"
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
                return None

            logging.error(
                f"OpenAI API error for property {property_index}: {error_message}"
            )
            return None

        except Exception as e:
            logging.error(
                f"Unexpected error evaluating property {property_index}: {str(e)}"
            )
            return None
