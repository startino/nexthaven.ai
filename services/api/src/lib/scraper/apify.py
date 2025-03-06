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
                parsed_item = ApifyResponse(
                    url=item["url"],
                    name=item["name"],
                    type=item["type"],
                    description=item["description"],
                    price=item["price"],
                    checkIn=item["checkIn"],
                    checkOut=item["checkOut"],
                    location=Location(
                        lat=item["location"]["lat"],
                        lng=item["location"]["lng"],
                    ),
                    address=Address(
                        full=item["address"]["full"],
                        postalCode=item["address"]["postalCode"],
                        street=item["address"]["street"],
                        country=item["address"]["country"],
                        region=item["address"]["region"],
                    ),
                    image=item["image"],
                    gallery=item["images"],
                    rooms=[Room(
                        available=room["available"],
                        url=room["url"],
                        roomType=room["roomType"],
                        persons=room["persons"],
                        bedTypes=[Details(
                            name=bedType["room"],
                            additionalInfo=bedType["beds"],
                        ) for bedType in room["bedTypes"]],
                        facilities=room["facilities"],
                    ) for room in item["rooms"]],
                    categoryReviews=[CategoryReview(
                        title=review["title"],
                        score=review["score"],
                    ) for review in item["categoryReviews"]],
                    facilities=[Facilities(
                        name=facility["name"],
                        overview=facility["overview"],
                        facilities=facility["facilities"],
                    ) for facility in item["facilities"]],
                )
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
