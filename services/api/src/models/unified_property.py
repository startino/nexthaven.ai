from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field

class Coordinates(BaseModel):
    lat: float | None
    lng: float | None

class PricingModel(BaseModel):
    total: float

class CapacityModel(BaseModel):
    bedrooms: int
    beds: int

class FeaturesModel(BaseModel):
    size: Optional[float] = None
    amenities: List[str]

class MediaModel(BaseModel):
    main_image: str
    gallery: List[str]

class UnifiedProperty(BaseModel):
    # Basic Information
    id: str
    source: str  # 'Booking.com' or 'Airbnb'
    url: str

    # Property Details
    name: str
    description: str

    # Location Information
    location: str
    coordinates: Coordinates

    # Pricing Information
    pricing: PricingModel

    # Capacity and Layout
    capacity: CapacityModel

    # Property Features
    features: FeaturesModel

    # Media
    media: MediaModel

    # AI Scoring
    score: Union[int, float] = Field(ge=0, description="Score must be a non-negative number")
    reasoning: str

    # Raw Data
    raw_data: Optional[Any] = None

    class Config:
        allow_population_by_field_name = True
