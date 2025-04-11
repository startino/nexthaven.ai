import os
import json
import logging
from dotenv import load_dotenv
import asyncio

from apify_client import ApifyClient
from src.models.booking_apify import (
    BookingApifyRequest,
    BookingApifyResponse,
    Room,
    Location,
    Address,
    Facilities,
    CategoryReview,
    Details,
)
from src.models.requirement import GeneratedRequirement

# Load environment variables
load_dotenv()


CONCURRENT_APIFY_API_CALLS = int(os.getenv("CONCURRENT_APIFY_API_CALLS", 3))


class BookingApifyScraper:
    """
    This class is used to interact with the Apify API for Booking.com scraping.
    """

    def __init__(self):
        self.client = ApifyClient(os.getenv("APIFY_API_TOKEN"))

    def generate_request(self, user_request: GeneratedRequirement):
        """
        Generate a request for the Booking.com Apify actor based on user requirements.

        Args:
            user_request: The generated requirements object containing search parameters

        Returns:
            BookingApifyRequest: A properly formatted request for the Apify API

        This method converts our internal GeneratedRequirement format into the specific
        format required by the Booking.com Apify actor, ensuring that all necessary
        parameters are properly formatted and included.

        Cursor Edit count: 1
        """
        logging.info(
            f"Generating Apify request for user request type: {type(user_request)}"
        )

        # Ensure user_request is a GeneratedRequirement object
        if isinstance(user_request, dict):
            logging.info(f"Converting dict to GeneratedRequirement: {user_request}")
            user_request_obj = GeneratedRequirement(**user_request)
        else:
            user_request_obj = user_request

        logging.info(
            f"Using GeneratedRequirement object: {user_request_obj.model_dump_json()}"
        )

        return BookingApifyRequest(
            search=user_request_obj.query,
            rooms=user_request_obj.number_of_rooms,
            adults=user_request_obj.adults,
            children=user_request_obj.children,
            checkIn=user_request_obj.date_range.start_date,
            checkOut=user_request_obj.date_range.end_date,
            minMaxPrice=f"{user_request_obj.nightly_budget.min}-{user_request_obj.nightly_budget.max}",
        )

    async def get_properties(
        self, request: BookingApifyRequest
    ) -> list[BookingApifyResponse]:
        """
        This method is used to get properties from the Apify API.
        """
        run_input = request.model_dump()

        # Store the original checkIn and checkOut dates from the request
        original_check_in = request.checkIn
        original_check_out = request.checkOut

        logging.info(f"Running Apify actor with input: {run_input}")

        # Run in a thread to avoid blocking the event loop
        loop = asyncio.get_event_loop()
        sortBy = ["bayesian_review_score", "class_and_price", "distance_from_search"]

        tasks = []
        for i in range(CONCURRENT_APIFY_API_CALLS):
            # Create a copy of run_input for each task
            task_input = run_input.copy()
            # Set different sortBy for each task
            task_input["sortBy"] = sortBy[i % len(sortBy)]

            tasks.append(
                loop.run_in_executor(
                    None,
                    lambda input=task_input: self.client.actor(
                        "oeiQgfg5fsmIJB7Cn"
                    ).call(
                        run_input=input,
                        memory_mbytes=8192,
                        # Calculate max_items before passing to avoid float issue
                        max_items=request.maxItems // CONCURRENT_APIFY_API_CALLS,
                    ),
                )
            )
        results = await asyncio.gather(*tasks)

        properties: list[BookingApifyResponse] = []

        # Process all results instead of just the first one
        for result in results:
            if result and "defaultDatasetId" in result:
                # Get dataset items in a non-blocking way
                dataset_id = result["defaultDatasetId"]

                items = await loop.run_in_executor(
                    None, lambda: list(self.client.dataset(dataset_id).iterate_items())
                )

                # Add detailed logging of the first item structure
                if items:
                    try:
                        logging.info(
                            f"First Booking.com Apify item keys: {list(items[0].keys())}"
                        )
                        logging.info(
                            f"checkIn value: {items[0].get('checkIn', 'NOT FOUND')}"
                        )
                        logging.info(
                            f"checkOut value: {items[0].get('checkOut', 'NOT FOUND')}"
                        )
                        logging.info(
                            f"checkInDate value: {items[0].get('checkInDate', 'NOT FOUND')}"
                        )
                        logging.info(
                            f"checkOutDate value: {items[0].get('checkOutDate', 'NOT FOUND')}"
                        )
                    except Exception as e:
                        logging.error(f"Error examining Booking.com Apify results: {e}")
                else:
                    logging.info("No items found in Booking.com Apify results")

                for item in items:
                    parsed_item = BookingApifyResponse(
                        url=item.get("url", ""),
                        name=item.get("name", ""),
                        type=item.get("type", ""),
                        description=item.get("description", ""),
                        price=item.get("price", 0),
                        # Use the original dates from the request (reliable formatted dates)
                        checkIn=original_check_in,
                        checkOut=original_check_out,
                        location=Location(
                            lat=float(item.get("location", {}).get("lat", 0)),
                            lng=float(item.get("location", {}).get("lng", 0)),
                        ),
                        address=Address(
                            full=item.get("address", {}).get("full", ""),
                            postalCode=item.get("address", {}).get("postalCode", ""),
                            street=item.get("address", {}).get("street", ""),
                            country=item.get("address", {}).get("country", ""),
                            region=item.get("address", {}).get("region", ""),
                        ),
                        image=item.get("image", ""),
                        gallery=item.get("images", []),
                        rooms=[
                            Room(
                                available=room.get("available", ""),
                                url=room.get("url", ""),
                                roomType=room.get("roomType", ""),
                                persons=room.get("persons", 0),
                                bedTypes=[
                                    Details(
                                        name=bedType.get("room", ""),
                                        additionalInfo=bedType.get("beds", ""),
                                    )
                                    for bedType in room.get("bedTypes", [])
                                ],
                                facilities=room.get("facilities", ""),
                            )
                            for room in item.get("rooms", [])
                        ],
                        categoryReviews=[
                            CategoryReview(
                                title=review.get("title", ""),
                                score=review.get("score", 0),
                            )
                            for review in item.get("categoryReviews", [])
                        ],
                        facilities=[
                            Facilities(
                                name=facility.get("name", ""),
                                overview=facility.get("overview", ""),
                                facilities=facility.get("facilities", ""),
                            )
                            for facility in item.get("facilities", [])
                        ],
                    )

                    properties.append(parsed_item)
            else:
                logging.error(
                    "No dataset ID returned from Apify for one of the results"
                )

        logging.info(f"Booking.com Apify results total: {len(properties)}")

        return properties


# if __name__ == "__main__":
#     apify_agent = BookingApifyScraper()
#     request = BookingApifyRequest(
#         search="New York",
#         maxItems=2,
#         sortBy="review_score_and_price",
#         starsCountFilter="any",
#         currency="USD",
#         language="en-gb",
#         rooms=2,
#         adults=3,
#         children=0,
#         minMaxPrice="0-2000",
#         checkIn="2025-04-11",
#         checkOut="2025-04-20",
#     )

#     # Run the async function in a new event loop
#     properties = asyncio.run(apify_agent.get_properties(request))
#     print(properties)
