import os
import json
import logging
from dotenv import load_dotenv
import asyncio

from apify_client import ApifyClient
from src.models.apify import BookingApifyRequest, BookingApifyResponse, Room, Location, Address, Facilities, CategoryReview, Details
from src.models.requirement import GeneratedRequirement

# Load environment variables
load_dotenv()

class BookingApifyAgent:
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
        logging.info(f"Generating Apify request for user request type: {type(user_request)}")
        
        # Ensure user_request is a GeneratedRequirement object
        if isinstance(user_request, dict):
            logging.info(f"Converting dict to GeneratedRequirement: {user_request}")
            user_request_obj = GeneratedRequirement(**user_request)
        else:
            user_request_obj = user_request
            
        logging.info(f"Using GeneratedRequirement object: {user_request_obj.model_dump_json()}")
        
        # # Default to Hotels if property_type is not specified or invalid
        # property_type = "Hotels"
        
        return BookingApifyRequest(
            search=user_request_obj.query,
            rooms=user_request_obj.number_of_rooms,
            adults=user_request_obj.adults,
            children=user_request_obj.children,
            checkIn=user_request_obj.date_range.start_date,
            checkOut=user_request_obj.date_range.end_date,
            minMaxPrice=f"{user_request_obj.nightly_budget.min}-{user_request_obj.nightly_budget.max}",
        )

    async def get_properties(self, request: BookingApifyRequest) -> list[BookingApifyResponse]:
        """
        This method is used to get properties from the Apify API.
        """
        run_input = request.model_dump()
        
        logging.info(f"Running Apify actor with input: {run_input}")

        # Run in a thread to avoid blocking the event loop
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None, 
            lambda: self.client.actor("oeiQgfg5fsmIJB7Cn").call(run_input=run_input, memory_mbytes=8192)
        )
        
        properties: list[BookingApifyResponse] = []
        if result and "defaultDatasetId" in result:
            # Get dataset items in a non-blocking way
            dataset_id = result["defaultDatasetId"]
            
            async def get_dataset_items():
                items = []
                for item in self.client.dataset(dataset_id).iterate_items():
                    items.append(item)
                return items
                
            items = await loop.run_in_executor(
                None,
                lambda: list(self.client.dataset(dataset_id).iterate_items())
            )
            
            for item in items:
                parsed_item = BookingApifyResponse(
                    url=item.get("url", ""),
                    name=item.get("name", ""),
                    type=item.get("type", ""),
                    description=item.get("description", ""),
                    price=item.get("price", 0),
                    checkIn=item.get("checkIn", ""),
                    checkOut=item.get("checkOut", ""),
                    location=Location(
                        lat=item.get("location", {}).get("lat", 0),
                        lng=item.get("location", {}).get("lng", 0),
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
                    rooms=[Room(
                        available=room.get("available", ""),
                        url=room.get("url", ""),
                        roomType=room.get("roomType", ""),
                        persons=room.get("persons", 0),
                        bedTypes=[Details(
                            name=bedType.get("room", ""),
                            additionalInfo=bedType.get("beds", ""),
                        ) for bedType in room.get("bedTypes", [])],
                        facilities=room.get("facilities", ""),
                    ) for room in item.get("rooms", [])],
                    categoryReviews=[CategoryReview(
                        title=review.get("title", ""),
                        score=review.get("score", 0),
                    ) for review in item.get("categoryReviews", [])],
                    facilities=[Facilities(
                        name=facility.get("name", ""),
                        overview=facility.get("overview", ""),
                        facilities=facility.get("facilities", ""),
                    ) for facility in item.get("facilities", [])],
                )
                
                properties.append(parsed_item)
        else:
            logging.error("No dataset ID returned from Apify")
            
        return properties

if __name__ == "__main__":
    apify_agent = BookingApifyAgent()
    request = BookingApifyRequest(
        search="New York",
        maxItems=2,
        sortBy="review_score_and_price",
        starsCountFilter="any",
        currency="USD",
        language="en-gb",
        rooms=2,
        adults=3,
        children=0,
        minMaxPrice="0-2000",
        checkIn="2025-02-28",
        checkOut="2025-03-13",
    )
    
    # Run the async function in a new event loop
    properties = asyncio.run(apify_agent.get_properties(request))
    print(properties) 