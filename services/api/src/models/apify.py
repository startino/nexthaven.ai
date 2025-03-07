from pydantic import BaseModel, Field
from typing import Literal
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get the default max items from environment variable or use 10 as fallback
DEFAULT_MAX_ITEMS = int(os.getenv("APIFY_MAX_ITEMS", 10))

# class ApifyInclude(BaseModel):
#     include_description: bool = Field(default=True, description="Whether to include the description of the property")
#     include_facilities: bool = Field(default=True, description="Whether to include the facilities of the property")
#     include_questions: int = Field(default=5, description="The number of questions to include in the property")
#     include_gallery: bool = Field(default=True, description="Whether to include the gallery of the property")
#     include_surroundings: bool = Field(default=True, description="Whether to include the surroundings of the property")
#     include_fineprints: bool = Field(default=True, description="Whether to include the fineprints of the property")

# class ApifyRequest(BaseModel):
#     search: str
#     currency: str = Field(default="USD", description="The currency to use for the search")
#     rooms: int = Field(default=1, description="The number of rooms to search for")
#     limit: int = Field(default=50, description="The number of properties to search for")
#     adults: int = Field(default=1, description="The number of adults to search for")
#     check_in: str = Field(description="The check-in date")
#     check_out: str = Field(description="The check-out date")
#     min_price: int = Field(default=0, description="The minimum price to search for")
#     max_price: int = Field(description="The maximum price to search for")
#     includes: ApifyInclude = Field(default=ApifyInclude(), description="The includes to search for")

class ApifyRequest(BaseModel):
    search: str = Field(description="The search query")
    maxItems: int = Field(default=DEFAULT_MAX_ITEMS, description="The maximum number of items to return")
    # propertyType: Literal["Apartments", "Hotels", "Hostels", "Guest houses", 
                          # "Homestays", "Bed and breakfasts", "Holiday homes", 
                          # "Boats","Villas", "Motels", "Resorts", "Holiday parks", 
                          # "Campsites", "Luxury tents"] = Field(description="The type of property to search for")
    sortBy: str = Field(default="review_score_and_price", description="The sort order")
    starsCountFilter: str = Field(default="any", description="The stars count filter")
    currency: str = Field(default="USD", description="The currency to use for the search")
    language: str = Field(default="en-gb", description="The language to use for the search")
    rooms: int = Field(default=1, description="The number of rooms to search for")
    adults: int = Field(default=2, description="The number of adults to search for")
    children: int = Field(default=0, description="The number of children to search for")
    minMaxPrice: str = Field(default="0-2000", description="The minimum and maximum price to search for")
    checkIn: str = Field(description="The check-in date")
    checkOut: str = Field(description="The check-out date")
    
class Location(BaseModel):
    lat: str | None
    lng: str | None
    
class Address(BaseModel):
    full: str | None
    postalCode: str | None
    street: str | None
    country: str | None
    region: str | None
    
class Details(BaseModel):
    name: str | None
    additionalInfo: list[str] | None
    
class Facilities(BaseModel):
    name: str | None
    overview: str | None
    facilities: list[Details]

class Room(BaseModel):
    available: bool | None
    url: str | None
    roomType: str | None
    persons: int | None
    bedTypes: list[Details] | None
    facilities: list[str] | None
    
class CategoryReview(BaseModel):
    title: str | None
    score: float | None
    
class ApifyResponse(BaseModel):
    url: str
    name: str
    type: str
    description: str
    price: float | None
    checkIn: str
    checkOut: str
    location: Location
    address: Address
    image: str
    gallery: list[str]
    rooms: list[Room]
    categoryReviews: list[CategoryReview]
    facilities: list[Facilities]