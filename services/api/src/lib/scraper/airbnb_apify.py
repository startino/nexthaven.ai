import os
import json
import logging
from dotenv import load_dotenv
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import asyncio

from apify_client import ApifyClient
from src.models.airbnb_apify import (
    AirbnbApifyRequest,
    AirbnbApifyResponse,
    AirbnbCoordinates,
    Rating,
    HouseRules,
    RuleGroup,
    RuleValue,
    Host,
    SubDescription,
    AmenityGroup,
    AmenityValue,
    LocationDescription,
    Highlight,
    Price,
    PriceBreakdown,
    PriceBreakdownItem,
    Image,
    HtmlDescription,
    Breadcrumb,
    BrandHighlights,
    CancellationPolicy,
)
from src.models.requirement import GeneratedRequirement

# Load environment variables
load_dotenv()

# Get the Apify API key from environment variable
APIFY_API_KEY = os.getenv("APIFY_API_KEY")
APIFY_MAX_ITEMS = int(os.getenv("APIFY_MAX_ITEMS", 10))

# Airbnb Apify actor ID
AIRBNB_ACTOR_ID = "dtrungtin/airbnb-scraper"


class AirbnbApifyAgent:
    """
    This class is used to interact with the Apify API for Airbnb scraping.
    """

    def __init__(self):
        self.client = ApifyClient(os.getenv("APIFY_API_TOKEN"))
        # Airbnb scraper actor ID from https://apify.com/tri_angle/airbnb-scraper
        self.actor_id = "tri_angle/airbnb-scraper"

    def generate_request(self, user_request: GeneratedRequirement):
        """
        Generate a request for the Airbnb Apify actor based on user requirements.

        Args:
            user_request: The generated requirements object containing search parameters

        Returns:
            AirbnbApifyRequest: A properly formatted request for the Apify API

        This method converts our internal GeneratedRequirement format into the specific
        format required by the Airbnb Apify actor, ensuring that all necessary parameters
        are properly formatted and included. It also handles special cases like long-term
        stays (28+ days) where Airbnb uses monthly pricing instead of nightly.

        Cursor Edit count: 1
        """
        logging.info(
            f"Generating Airbnb Apify request for user request type: {type(user_request)}"
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

        # Handle stays of 28+ days
        if (
            user_request_obj.date_range.end_date
            and user_request_obj.date_range.start_date
        ):
            stay_duration = (
                datetime.strptime(user_request_obj.date_range.end_date, "%Y-%m-%d")
                - datetime.strptime(user_request_obj.date_range.start_date, "%Y-%m-%d")
            ).days
            if stay_duration >= 28:
                # Update Apify request's max and min prices to reflect monthly pricing
                user_request_obj.nightly_budget.min *= 28
                user_request_obj.nightly_budget.max *= 28

        # Use locationQueries instead of search
        return AirbnbApifyRequest(
            locationQueries=[user_request_obj.query],  # Pass as a list of locations
            checkIn=user_request_obj.date_range.start_date,
            checkOut=user_request_obj.date_range.end_date,
            adults=user_request_obj.adults,
            children=user_request_obj.children,
            # Prices are nightly until >=28 days (Airbnb switches to monthly pricing)
            priceMin=user_request_obj.nightly_budget.min,
            priceMax=user_request_obj.nightly_budget.max,
            currency="USD",
            locale="en-US",
        )

    async def get_properties(
        self, request: AirbnbApifyRequest
    ) -> list[AirbnbApifyResponse]:
        """
        This method is used to get properties from the Apify API for Airbnb.
        """
        run_input = request.model_dump(exclude_none=True)

        logging.info(f"Running Airbnb Apify actor with input: {run_input}")

        # Call the Airbnb scraper actor asynchronously
        loop = asyncio.get_event_loop()
        run = await loop.run_in_executor(
            None,
            lambda: self.client.actor(self.actor_id).call(
                run_input=run_input, max_items=APIFY_MAX_ITEMS
            ),
        )

        properties: list[AirbnbApifyResponse] = []
        if run and "defaultDatasetId" in run:
            dataset_id = run["defaultDatasetId"]
            logging.info(f"Dataset ID: {dataset_id}")

            # Get dataset items in a non-blocking way
            items = await loop.run_in_executor(
                None, lambda: list(self.client.dataset(dataset_id).iterate_items())
            )

            # Iterate through the dataset items
            for item in items:
                try:
                    # Parse the raw response into our model
                    parsed_item = self._parse_airbnb_item(item)
                    properties.append(parsed_item)
                except Exception as e:
                    logging.error(f"Error parsing Airbnb item: {str(e)}")
                    logging.error(f"Problematic item: {json.dumps(item)[:500]}...")
        else:
            logging.error("No dataset ID returned from Apify")

        return properties

    def _parse_airbnb_item(self, item: dict) -> AirbnbApifyResponse:
        """
        Parse an Airbnb item from the Apify API response into our model.

        Args:
            item: The raw Airbnb item from Apify
            stay_duration: The duration of the stay in days (optional)

        Returns:
            The parsed AirbnbApifyResponse
        """
        try:
            # Extract coordinates
            coordinates = AirbnbCoordinates(
                latitude=item.get("coordinates", {}).get("latitude", 0),
                longitude=item.get("coordinates", {}).get("longitude", 0),
            )

            # Extract rating
            rating = None
            if "rating" in item and item["rating"]:
                rating = Rating(
                    accuracy=item["rating"].get("accuracy"),
                    checking=item["rating"].get("checking"),
                    cleanliness=item["rating"].get("cleanliness"),
                    communication=item["rating"].get("communication"),
                    location=item["rating"].get("location"),
                    value=item["rating"].get("value"),
                    guestSatisfaction=item["rating"].get("guestSatisfaction"),
                    reviewsCount=item["rating"].get("reviewsCount"),
                )

            # Extract house rules
            house_rules = None
            if "houseRules" in item and item["houseRules"]:
                try:
                    general_rules = []
                    if "general" in item["houseRules"] and isinstance(
                        item["houseRules"]["general"], list
                    ):
                        for rule_group_data in item["houseRules"]["general"]:
                            values = []
                            if "values" in rule_group_data and isinstance(
                                rule_group_data["values"], list
                            ):
                                for value_data in rule_group_data["values"]:
                                    values.append(
                                        RuleValue(
                                            title=value_data.get("title", ""),
                                            icon=value_data.get("icon"),
                                            subtitle=value_data.get("subtitle"),
                                            available=value_data.get("available"),
                                        )
                                    )

                            general_rules.append(
                                RuleGroup(
                                    title=rule_group_data.get("title", ""),
                                    values=values,
                                )
                            )

                    house_rules = HouseRules(
                        additional=item["houseRules"].get("additional"),
                        general=general_rules,
                    )
                except Exception as e:
                    logging.error(f"Error parsing house rules: {str(e)}")
                    house_rules = HouseRules()

            # Extract host information
            host_data = item.get("host", {})
            host = Host(
                id=host_data.get("id"),
                name=host_data.get("name"),
                isSuperHost=host_data.get("isSuperHost", False),
                profileImage=host_data.get("profileImage"),
                highlights=host_data.get("highlights", []),
                about=host_data.get("about", ""),  # Handle about as string
                ratingCount=host_data.get("ratingCount"),
                ratingAverage=host_data.get("ratingAverage"),
                hostDetails=host_data.get("hostDetails"),
                timeAsHost=host_data.get("timeAsHost"),
                isVerified=host_data.get("isVerified"),
            )

            # Extract sub-description
            sub_description_data = item.get("subDescription", {})
            sub_description = SubDescription(
                title=sub_description_data.get("title"),
                items=sub_description_data.get("items", []),
            )

            # Extract amenities
            amenities = []
            if "amenities" in item and isinstance(item["amenities"], list):
                for amenity_group_data in item["amenities"]:
                    values = []
                    if "values" in amenity_group_data and isinstance(
                        amenity_group_data["values"], list
                    ):
                        for value_data in amenity_group_data["values"]:
                            values.append(
                                AmenityValue(
                                    title=value_data.get("title", ""),
                                    subtitle=value_data.get("subtitle", ""),
                                    icon=value_data.get("icon"),
                                    available=value_data.get("available", True),
                                )
                            )

                    amenities.append(
                        AmenityGroup(
                            title=amenity_group_data.get("title", ""), values=values
                        )
                    )

            # Extract location descriptions
            location_descriptions = []
            if "locationDescriptions" in item and isinstance(
                item["locationDescriptions"], list
            ):
                for loc_desc_data in item["locationDescriptions"]:
                    location_descriptions.append(
                        LocationDescription(
                            title=loc_desc_data.get("title", ""),
                            content=loc_desc_data.get("content"),
                            mapMarkerRadiusInMeters=loc_desc_data.get(
                                "mapMarkerRadiusInMeters"
                            ),
                        )
                    )

            # Extract highlights
            highlights = []
            if "highlights" in item and isinstance(item["highlights"], list):
                for highlight_data in item["highlights"]:
                    highlights.append(
                        Highlight(
                            title=highlight_data.get("title", ""),
                            subtitle=highlight_data.get("subtitle"),
                            icon=highlight_data.get("icon"),
                            type=highlight_data.get("type"),
                        )
                    )

            # Extract images
            images = []
            if "images" in item and item["images"]:
                if isinstance(item["images"], list):
                    for image_data in item["images"]:
                        if isinstance(image_data, dict):
                            images.append(
                                Image(
                                    caption=image_data.get("caption"),
                                    imageUrl=image_data.get("imageUrl"),
                                    orientation=image_data.get("orientation"),
                                )
                            )
                        elif isinstance(image_data, str):
                            # Handle case where image is just a string URL
                            images.append(Image(imageUrl=image_data))

            # Extract price information and normalize if needed for long stays
            price = Price()
            if "price" in item and item["price"]:
                price_data = item["price"]

                # Extract price breakdown
                breakdown = None
                if "breakDown" in price_data and price_data["breakDown"]:
                    bd_data = price_data["breakDown"]

                    # Extract base price
                    base_price = None
                    if "basePrice" in bd_data and bd_data["basePrice"]:
                        base_price = PriceBreakdownItem(
                            description=bd_data["basePrice"].get("description", ""),
                            price=bd_data["basePrice"].get("price", ""),
                        )

                    # Extract base price breakdown
                    base_price_breakdown = []
                    if "basePriceBreakdown" in bd_data and isinstance(
                        bd_data["basePriceBreakdown"], list
                    ):
                        for bp_item in bd_data["basePriceBreakdown"]:
                            base_price_breakdown.append(
                                PriceBreakdownItem(
                                    description=bp_item.get("description", ""),
                                    price=bp_item.get("price", ""),
                                )
                            )

                    # Extract service fee
                    service_fee = None
                    if "serviceFee" in bd_data and bd_data["serviceFee"]:
                        service_fee = PriceBreakdownItem(
                            description=bd_data["serviceFee"].get("description", ""),
                            price=bd_data["serviceFee"].get("price", ""),
                        )

                    # Extract total before taxes
                    total_before_taxes = None
                    if "totalBeforeTaxes" in bd_data and bd_data["totalBeforeTaxes"]:
                        total_before_taxes = PriceBreakdownItem(
                            description=bd_data["totalBeforeTaxes"].get(
                                "description", ""
                            ),
                            price=bd_data["totalBeforeTaxes"].get("price", ""),
                        )

                    # Extract taxes
                    taxes = None
                    if "taxes" in bd_data and bd_data["taxes"]:
                        taxes = PriceBreakdownItem(
                            description=bd_data["taxes"].get("description", ""),
                            price=bd_data["taxes"].get("price", ""),
                        )

                    # Extract total
                    total = None
                    if "total" in bd_data and bd_data["total"]:
                        total = PriceBreakdownItem(
                            description=bd_data["total"].get("description", ""),
                            price=bd_data["total"].get("price", ""),
                        )

                    # Extract cleaning fee
                    cleaning_fee = None
                    if "cleaningFee" in bd_data and bd_data["cleaningFee"]:
                        cleaning_fee = PriceBreakdownItem(
                            description=bd_data["cleaningFee"].get("description", ""),
                            price=bd_data["cleaningFee"].get("price", ""),
                        )

                    # Extract special offer
                    special_offer = None
                    if "specialOffer" in bd_data and bd_data["specialOffer"]:
                        special_offer = PriceBreakdownItem(
                            description=bd_data["specialOffer"].get("description", ""),
                            price=bd_data["specialOffer"].get("price", ""),
                        )

                    # Extract early bird discount
                    early_bird_discount = None
                    if "earlyBirdDiscount" in bd_data and bd_data["earlyBirdDiscount"]:
                        early_bird_discount = PriceBreakdownItem(
                            description=bd_data["earlyBirdDiscount"].get(
                                "description", ""
                            ),
                            price=bd_data["earlyBirdDiscount"].get("price", ""),
                        )

                    breakdown = PriceBreakdown(
                        basePrice=base_price,
                        basePriceBreakdown=base_price_breakdown,
                        serviceFee=service_fee,
                        totalBeforeTaxes=total_before_taxes,
                        taxes=taxes,
                        total=total,
                        cleaningFee=cleaning_fee,
                        specialOffer=special_offer,
                        earlyBirdDiscount=early_bird_discount,
                    )

                price = Price(
                    label=price_data.get("label"),
                    amount=price_data.get("amount"),
                    price=price_data.get("price"),
                    qualifier=price_data.get("qualifier"),
                    breakDown=breakdown,
                    originalPrice=price_data.get("originalPrice"),
                    discountedPrice=price_data.get("discountedPrice"),
                )

            # Extract HTML description
            html_description = None
            if "htmlDescription" in item and item["htmlDescription"]:
                html_description = HtmlDescription(
                    htmlText=item["htmlDescription"].get("htmlText"),
                    recommendedNumberOfLines=item["htmlDescription"].get(
                        "recommendedNumberOfLines"
                    ),
                )

            # Extract breadcrumbs
            breadcrumbs = []
            if "breadcrumbs" in item and isinstance(item["breadcrumbs"], list):
                for breadcrumb_data in item["breadcrumbs"]:
                    breadcrumbs.append(
                        Breadcrumb(
                            linkRoute=breadcrumb_data.get("linkRoute"),
                            linkText=breadcrumb_data.get("linkText"),
                            searchText=breadcrumb_data.get("searchText"),
                        )
                    )

            # Extract brand highlights
            brand_highlights = None
            if "brandHighlights" in item and item["brandHighlights"]:
                brand_highlights = BrandHighlights(
                    title=item["brandHighlights"].get("title"),
                    subtitle=item["brandHighlights"].get("subtitle"),
                    hasGoldenLaurel=item["brandHighlights"].get("hasGoldenLaurel"),
                )

            # Extract cancellation policies
            cancellation_policies = []
            if "cancellationPolicies" in item and isinstance(
                item["cancellationPolicies"], list
            ):
                for policy_data in item["cancellationPolicies"]:
                    cancellation_policies.append(
                        CancellationPolicy(
                            title=policy_data.get("title"),
                            policyName=policy_data.get("policyName"),
                            policyId=policy_data.get("policyId"),
                        )
                    )

            # Create and return the AirbnbApifyResponse object
            return AirbnbApifyResponse(
                id=item.get("id", ""),
                coordinates=coordinates,
                description=item.get("description", ""),
                descriptionOriginalLanguage=item.get("descriptionOriginalLanguage"),
                title=item.get("title", ""),
                thumbnail=item.get("thumbnail", ""),
                url=item.get("url", ""),
                androidLink=item.get("androidLink"),
                iosLink=item.get("iosLink"),
                roomType=item.get("roomType", ""),
                propertyType=item.get("propertyType"),
                isSuperHost=item.get("isSuperHost", False),
                homeTier=item.get("homeTier"),
                personCapacity=item.get("personCapacity", 0),
                rating=rating,
                houseRules=house_rules,
                host=host,
                subDescription=sub_description,
                amenities=amenities,
                coHosts=item.get("coHosts", []),
                images=images,
                locationDescriptions=location_descriptions,
                highlights=highlights,
                locale=item.get("locale", "en"),
                language=item.get("language", "en"),
                price=price,
                metaDescription=item.get("metaDescription"),
                seoTitle=item.get("seoTitle"),
                sharingConfigTitle=item.get("sharingConfigTitle"),
                breadcrumbs=breadcrumbs,
                location=item.get("location"),
                locationSubtitle=item.get("locationSubtitle"),
                htmlDescription=html_description,
                brandHighlights=brand_highlights,
                cancellationPolicies=cancellation_policies,
                # checkIn=item.get("checkIn"),
                # checkOut=item.get("checkOut"),
                checkIn=item.get("checkInDate", item.get("checkIn")),
                checkOut=item.get("checkOutDate", item.get("checkOut")),
                timestamp=item.get("timestamp"),
            )
        except Exception as e:
            logging.error(f"Error in _parse_airbnb_item: {str(e)}")
            raise


if __name__ == "__main__":
    # Example usage
    import json
    from datetime import datetime, timedelta

    # Set up test parameters
    location = "New York"
    check_in = (datetime.now() + timedelta(days=30)).strftime(
        "%Y-%m-%d"
    )  # 30 days from now
    check_out = (datetime.now() + timedelta(days=37)).strftime(
        "%Y-%m-%d"
    )  # 7 days stay

    print(f"Testing Airbnb scraper with the following parameters:")
    print(f"Location: {location}")
    print(f"Check-in: {check_in}")
    print(f"Check-out: {check_out}")
    print(f"Adults: 2, Children: 0")
    print(f"Price range: $100-$500 per night")
    print(f"Max items: {os.getenv('APIFY_MAX_ITEMS', 10)}")
    print("-----------------------------------")

    # Initialize the agent and create a request
    airbnb_agent = AirbnbApifyAgent()
    request = AirbnbApifyRequest(
        locationQueries=[location],
        checkIn=check_in,
        checkOut=check_out,
        adults=2,
        children=0,
        priceMin=100,
        priceMax=500,  # Increased max price for more results
        currency="USD",
        locale="en-US",
    )

    print("Sending request to Apify...")
    properties = asyncio.run(airbnb_agent.get_properties(request))
    print(f"Found {len(properties)} properties")

    if properties:
        print("\nProperty details:")
        for i, prop in enumerate(properties):
            print(f"\n{i+1}. {prop.title}")
            print(f"   ID: {prop.id}")
            print(f"   Type: {prop.roomType}")
            print(f"   URL: {prop.url}")
            print(f"   Price: {prop.price.label if prop.price else 'N/A'}")
            print(
                f"   Rating: {prop.rating.guestSatisfaction if prop.rating else 'N/A'} ({prop.rating.reviewsCount if prop.rating and prop.rating.reviewsCount else 0} reviews)"
            )
            print(f"   Host: {prop.host.name} (SuperHost: {prop.host.isSuperHost})")
            print(f"   Capacity: {prop.personCapacity} guests")
            print(
                f"   Location: {prop.coordinates.latitude}, {prop.coordinates.longitude}"
            )

            # Save the first property to a JSON file for inspection
            if i == 0:
                with open("airbnb_sample_property.json", "w") as f:
                    json.dump(prop.model_dump(), f, indent=2)
                print(f"   First property saved to airbnb_sample_property.json")
    else:
        print("No properties found. Check your API key and request parameters.")
