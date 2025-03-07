import os
import json
import logging
from dotenv import load_dotenv

from apify_client import ApifyClient
from src.models.apify import ApifyRequest, ApifyResponse, Room, Location, Address, Facilities, CategoryReview, Details
from src.models.requirement import GeneratedRequirement

# Load environment variables
load_dotenv()

class ApifyAgent:
    """
    This class is used to interact with the Apify API.
    """
    def __init__(self):
        self.client = ApifyClient(os.getenv("APIFY_API_TOKEN"))
        
    def generate_request(self, user_request: GeneratedRequirement):
        logging.info(f"Generating Apify request for user request: {user_request}")
        
        # # Default to Hotels if property_type is not specified or invalid
        # property_type = "Hotels"
        
        return ApifyRequest(
            search=user_request.query,
            rooms=user_request.number_of_rooms,
            adults=user_request.adults,
            children=user_request.children,
            checkIn=user_request.date_range.start_date,
            checkOut=user_request.date_range.end_date,
            minMaxPrice=f"{user_request.nightly_budget.min}-{user_request.nightly_budget.max}",
            # propertyType=property_type,
        )

    def get_properties(self, request: ApifyRequest) -> list:
        """
        This method is used to get properties from the Apify API.
        """
        run_input = request.model_dump()
        
        logging.info(f"Running Apify actor with input: {run_input}")

        result = self.client.actor("oeiQgfg5fsmIJB7Cn").call(run_input=run_input)
        
        properties = []
        if result and "defaultDatasetId" in result:
            for item in self.client.dataset(result["defaultDatasetId"]).iterate_items():
                # Debug logging for raw Apify item
                logging.info(f"Raw Apify item - image field: {item.get('image')}")
                
                parsed_item = ApifyResponse(
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
                
                # Debug logging for parsed Apify item
                logging.info(f"Parsed Apify item - image field: {parsed_item.image}")
                
                properties.append(parsed_item)
        else:
            logging.error("No dataset ID returned from Apify")
            
        return properties

if __name__ == "__main__":
    apify_agent = ApifyAgent()
    request = ApifyRequest(
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
    properties = apify_agent.get_properties(request)
    print(properties)
