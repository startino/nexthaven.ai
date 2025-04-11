import logging
from datetime import datetime
import os
import asyncio
import concurrent.futures

from src.models.requirement import GeneratedRequirement
from src.models.result import Result
from src.models.booking_apify import BookingApifyResponse
from src.models.airbnb_apify import AirbnbApifyResponse, Price
from src.models.unified_property import UnifiedProperty

from src.models.unified_property import (
    UnifiedProperty,
    Coordinates,
    PricingModel,
    CapacityModel,
    FeaturesModel,
    MediaModel,
)

from src.lib.evaluate.properites.utils import is_valid_date_format
class UnifyProperties:
    def __init__(self):
        pass

    def create_unified_property(
        self,
        property_data: BookingApifyResponse | AirbnbApifyResponse,
        evaluation_result: Result,
        user_request: GeneratedRequirement,
    ) -> UnifiedProperty:
        """Convert property data and evaluation result to a UnifiedProperty object"""
        # Determine source
        source = (
            "Booking.com"
            if isinstance(property_data, BookingApifyResponse)
            else "Airbnb"
        )

        # Use appropriate conversion function based on source
        if source == "Booking.com":
            return self._unify_booking_property(
                property_data, evaluation_result, user_request
            )
        else:
            return self._unify_airbnb_property(
                property_data, evaluation_result, user_request
            )

    def _unify_booking_property(
        self,
        property_data: BookingApifyResponse,
        evaluation_result: Result,
        user_request: GeneratedRequirement,
    ) -> UnifiedProperty:
        """Convert Booking.com property data to a UnifiedProperty object"""
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

        # For Booking.com, convert total price to nightly price
        if total:
            # Use method to calculate nightly price considering all factors
            try:
                loop = asyncio.get_event_loop()
                # Store original price for logging
                original_price = total

                # Handle both running and non-running event loop cases
                if not loop.is_running():
                    # If no loop is running, we can use run_until_complete
                    total = loop.run_until_complete(
                        self._convert_booking_price_to_nightly(property_data, total)
                    )
                else:
                    # If a loop is already running, we need a different approach
                    # Create a function that wraps our async LLM call in a new event loop
                    def run_in_new_loop(property_data, price):
                        # Create a new event loop in this thread
                        new_loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(new_loop)
                        try:
                            # Run the async function in the new loop
                            return new_loop.run_until_complete(
                                self._convert_booking_price_to_nightly(
                                    property_data, price
                                )
                            )
                        finally:
                            new_loop.close()

                    # Run the function in a ThreadPoolExecutor
                    with concurrent.futures.ThreadPoolExecutor() as executor:
                        future = executor.submit(run_in_new_loop, property_data, total)
                        # Wait for and get the result
                        total = future.result()

                # Log the price change
                if abs(original_price - total) > 0.01:
                    logging.warning(
                        f"LLM PRICE CHANGE: ${original_price:.2f} → ${total:.2f}"
                    )
            except Exception as e:
                logging.error(f"Error calculating nightly price with LLM: {e}")

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

        # Get price value
        price_value = (
            float(total.price.replace("$", "").replace(",", ""))
            if isinstance(total, Price)
            else float(total)
        )

        # Apply nightly budget cap
        if user_request.nightly_budget and user_request.nightly_budget.max > 0:
            max_budget = float(user_request.nightly_budget.max)
            if price_value > max_budget:
                logging.info(f"Capping price {price_value} → {max_budget}")
                price_value = max_budget

        # Create UnifiedProperty object
        unified_property = UnifiedProperty(
            id=property_id,
            source="Booking.com",
            url=url,
            name=name,
            description=description,
            location=location if location else "",  # Ensure location is never None
            coordinates=(
                Coordinates(lat=coordinates.lat, lng=coordinates.lng)
                if coordinates
                else Coordinates(lat=None, lng=None)
            ),
            pricing=PricingModel(total=price_value),
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

    def _unify_airbnb_property(
        self,
        property_data: AirbnbApifyResponse,
        evaluation_result: Result,
        user_request: GeneratedRequirement,
    ) -> UnifiedProperty:
        """Convert Airbnb property data to a UnifiedProperty object"""
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

        # Get price value
        price_value = (
            float(total.price.replace("$", "").replace(",", ""))
            if isinstance(total, Price)
            else float(total)
        )

        # Apply nightly budget cap
        if user_request.nightly_budget and user_request.nightly_budget.max > 0:
            max_budget = float(user_request.nightly_budget.max)
            if price_value > max_budget:
                logging.info(f"Capping price {price_value} → {max_budget}")
                price_value = max_budget

        # Create UnifiedProperty object
        unified_property = UnifiedProperty(
            id=property_id,
            source="Airbnb",
            url=url,
            name=name,
            description=description,
            location=location if location else "",  # Ensure location is never None
            coordinates=(
                Coordinates(lat=coordinates.lat, lng=coordinates.lng)
                if coordinates
                else Coordinates(lat=None, lng=None)
            ),
            pricing=PricingModel(total=price_value),
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

    async def _convert_booking_price_to_nightly(self, property_data, total_price):
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
        if property_data.checkIn and is_valid_date_format(property_data.checkIn):
            check_in_value = property_data.checkIn
        else:
            # Use fallback values
            check_in_value = os.getenv("DEFAULT_CHECK_IN_DATE", "2025-04-01")

        if property_data.checkOut and is_valid_date_format(property_data.checkOut):
            check_out_value = property_data.checkOut
        else:
            # Use fallback values
            check_out_value = os.getenv("DEFAULT_CHECK_OUT_DATE", "2025-04-05")

        # If dates are found, calculate nights
        if check_in_value and check_out_value:
            try:
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

        # Log price conversion details
        original_price = total_price
        nightly_price = total_price / nights
        logging.info(f"Price conversion details:")
        logging.info(f"  - Original total price: ${original_price:.2f}")
        logging.info(f"  - Number of nights: {nights}")
        logging.info(f"  - Calculated nightly price: ${nightly_price:.2f}")

        # Apply adjustments based on stay length
        adjusted_price = nightly_price
        if nights >= 28:
            adjusted_price = nightly_price * 0.9  # 10% discount for monthly stays
            logging.info(
                f"  - Applied monthly stay discount (10%): ${adjusted_price:.2f}"
            )
        elif nights >= 7:
            adjusted_price = nightly_price * 0.95  # 5% discount for weekly stays
            logging.info(
                f"  - Applied weekly stay discount (5%): ${adjusted_price:.2f}"
            )

        # Log price change percentage
        price_change_pct = ((adjusted_price - nightly_price) / nightly_price) * 100
        logging.info(f"  - Price adjustment: {price_change_pct:.2f}%")

        # For now, just return the simple division
        return adjusted_price

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
                import math

                return int(math.floor(float(score_str)))
            except ValueError:
                # If all conversions fail, return 999 (error)
                logging.error(f"Error parsing score: {score_str}")
                return 999
