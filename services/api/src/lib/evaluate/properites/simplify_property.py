import logging, os
from typing import Any
from src.models.booking_apify import BookingApifyResponse
from src.models.airbnb_apify import AirbnbApifyResponse
from src.lib.evaluate.properites.utils import is_valid_date_format

class SimplifyProperty:
    def __init__(self):
        self.default_check_in_date = os.getenv("DEFAULT_CHECK_IN_DATE", "2025-04-01")
        self.default_check_out_date = os.getenv("DEFAULT_CHECK_OUT_DATE", "2025-04-05")
        self.monthly_discount_factor = 0.9
        self.weekly_discount_factor = 0.95
        self.max_amenities = 10

    def __call__(
        self, property_data: BookingApifyResponse | AirbnbApifyResponse
    ) -> dict[str, Any]:
        """Convert ApifyResponse to a simplified dictionary for the LLM"""
        if isinstance(property_data, BookingApifyResponse):
            return self._simplify_booking_property(property_data)
        elif isinstance(property_data, AirbnbApifyResponse):
            return self._simplify_airbnb_property(property_data)
        else:
            raise ValueError(f"Unsupported property type: {type(property_data)}")

    def _simplify_booking_property(
        self, property_data: BookingApifyResponse
    ) -> dict[str, Any]:
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
        if property_data.checkIn and is_valid_date_format(property_data.checkIn):
            check_in_value = property_data.checkIn
        else:
            # Use fallback values
            check_in_value = self.default_check_in_date

        if property_data.checkOut and is_valid_date_format(property_data.checkOut):
            check_out_value = property_data.checkOut
        else:
            # Use fallback values
            check_out_value = self.default_check_out_date

        result = {
            "name": property_data.name,
            "url": property_data.url,
            "price": property_data.price,
            "price_type": "total",
            "source": "Booking.com",
            "check_in": check_in_value,
            "check_out": check_out_value,
            "location": property_data.address.full if property_data.address else "",
            "rooms": len(property_data.rooms) if property_data.rooms else 0,
            "amenities": amenities[: self.max_amenities],
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

                if property_data.checkIn and is_valid_date_format(property_data.checkIn):
                    check_in_value = property_data.checkIn
                else:
                    # Use fallback values
                    check_in_value = self.default_check_in_date

                if property_data.checkOut and is_valid_date_format(property_data.checkOut):
                    check_out_value = property_data.checkOut
                else:
                    # Use fallback values
                    check_out_value = self.default_check_out_date

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
                            result["price"] * self.monthly_discount_factor
                        )  # Simple adjustment for monthly discounts
                    elif nights >= 7:
                        # Weekly stay, might have minor discount
                        result["price"] = (
                            result["price"] * self.weekly_discount_factor
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
    ) -> dict[str, Any]:
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
            "amenities": amenities[: self.max_amenities],
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

                if property_data.checkIn and is_valid_date_format(property_data.checkIn):
                    check_in_value = property_data.checkIn
                else:
                    # Use fallback values
                    check_in_value = self.default_check_in_date

                if property_data.checkOut and is_valid_date_format(property_data.checkOut):
                    check_out_value = property_data.checkOut
                else:
                    # Use fallback values
                    check_out_value = self.default_check_out_date

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
                            result["price"] * self.monthly_discount_factor
                        )  # Simple adjustment for monthly discounts
                    elif nights >= 7:
                        # Weekly stay, might have minor discount
                        result["price"] = (
                            result["price"] * self.weekly_discount_factor
                        )  # Simple adjustment for weekly discounts
                else:
                    logging.warning(
                        f"Invalid night count {nights} in _simplify_airbnb_property"
                    )
            except Exception as e:
                logging.warning(f"Error calculating nightly price from dates: {e}")

        return result
