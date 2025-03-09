from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get the default max items from environment variable or use 10 as fallback
APIFY_MAX_ITEMS = int(os.getenv("APIFY_MAX_ITEMS", 10))

class AirbnbApifyRequest(BaseModel):
    """
    Request model for the Airbnb Apify scraper.
    Based on: https://apify.com/tri_angle/airbnb-scraper/input-schema
    """
    locationQueries: List[str] | None = Field(default=None, description="List of location queries to scrape")
    startUrls: List[Dict[str, str]] | None = Field(default=None, description="List of Airbnb URLs to start with")
    checkIn: str | None = Field(default=None, description="Check-in date in YYYY-MM-DD format")
    checkOut: str | None = Field(default=None, description="Check-out date in YYYY-MM-DD format")
    locale: str = Field(default="en-US", description="Localized results in this locale will be extracted")
    currency: str = Field(default="USD", description="Currency that will be extracted for prices")
    priceMin: int | None = Field(default=None, description="Minimum price")
    priceMax: int | None = Field(default=None, description="Maximum price")
    minBeds: int | None = Field(default=None, description="Minimum beds")
    minBedrooms: int | None = Field(default=None, description="Minimum bedrooms")
    minBathrooms: int | None = Field(default=None, description="Minimum bathrooms")
    adults: int | None = Field(default=None, description="Number of adults")
    children: int | None = Field(default=None, description="Number of children")
    infants: int | None = Field(default=None, description="Number of infants")
    pets: int | None = Field(default=None, description="Number of pets")
    proxyConfiguration: Dict[str, Any] | None = Field(default=None, description="Proxy configuration")

class Coordinates(BaseModel):
    latitude: float
    longitude: float

class Rating(BaseModel):
    accuracy: float | None = None
    checking: float | None = None
    cleanliness: float | None = None
    communication: float | None = None
    location: float | None = None
    value: float | None = None
    guestSatisfaction: float | None = None
    reviewsCount: int | None = None

class RuleValue(BaseModel):
    title: str
    icon: str | None = None
    subtitle: str | None = None
    available: bool | str | None = None

class RuleGroup(BaseModel):
    title: str
    values: List[RuleValue]

class HouseRules(BaseModel):
    additional: Optional[str] = ""
    general: List[RuleGroup] = []

class Host(BaseModel):
    id: Optional[str] = None
    name: str | None = None
    isSuperHost: bool | None = False
    profileImage: str | None = None
    highlights: List[str] = []
    about: Union[str, List[str]] = ""
    ratingCount: int | None = None
    ratingAverage: float | None = None
    hostDetails: List[str] | None = None
    timeAsHost: Dict[str, Any] | None = None
    isVerified: bool | None = None

class SubDescription(BaseModel):
    title: Optional[str] = None
    items: List[str] = []

class AmenityValue(BaseModel):
    title: str
    subtitle: Optional[str] = ""
    icon: Optional[str] = None
    available: Optional[Union[bool, str]] = True

class AmenityGroup(BaseModel):
    title: str
    values: List[AmenityValue] = []

class LocationDescription(BaseModel):
    title: str
    content: Optional[str] = None
    mapMarkerRadiusInMeters: Optional[int] = None

class Highlight(BaseModel):
    title: str
    subtitle: Optional[str] = None
    icon: Optional[str] = None
    type: Optional[str] = None

class PriceBreakdownItem(BaseModel):
    description: str
    price: str

class PriceBreakdown(BaseModel):
    basePrice: PriceBreakdownItem | None = None
    basePriceBreakdown: List[PriceBreakdownItem] = []
    serviceFee: PriceBreakdownItem | None = None
    totalBeforeTaxes: PriceBreakdownItem | None = None
    taxes: PriceBreakdownItem | None = None
    total: PriceBreakdownItem | None = None
    cleaningFee: PriceBreakdownItem | None = None
    specialOffer: PriceBreakdownItem | None = None
    earlyBirdDiscount: PriceBreakdownItem | None = None

class Price(BaseModel):
    label: str | None = None
    amount: str | None = None
    price: str | None = None
    qualifier: str | None = None
    breakDown: PriceBreakdown | None = None
    originalPrice: str | None = None
    discountedPrice: str | None = None

class Image(BaseModel):
    caption: str | None = None
    imageUrl: str | None = None
    orientation: str | None = None

class HtmlDescription(BaseModel):
    htmlText: str | None = None
    recommendedNumberOfLines: int | None = None

class Breadcrumb(BaseModel):
    linkRoute: str | None = None
    linkText: str | None = None
    searchText: str | None = None

class BrandHighlights(BaseModel):
    title: str | None = None
    subtitle: str | None = None
    hasGoldenLaurel: bool | None = None

class CancellationPolicy(BaseModel):
    title: str | None = None
    policyName: str | None = None
    policyId: int | None = None

class AirbnbApifyResponse(BaseModel):
    """
    Response model for the Airbnb Apify scraper.
    """
    id: str
    coordinates: Coordinates
    description: str | None = ""
    descriptionOriginalLanguage: str | None = None
    title: str
    thumbnail: str | None = ""
    url: str
    androidLink: str | None = None
    iosLink: str | None = None
    roomType: str | None = ""
    propertyType: str | None = None
    isSuperHost: bool | None = False
    homeTier: int | None = None
    personCapacity: int | None = 0
    rating: Rating | None = None
    houseRules: HouseRules | None = None
    host: Host
    subDescription: SubDescription
    amenities: List[AmenityGroup] = []
    coHosts: List[Any] = []
    images: List[Image] = []
    locationDescriptions: List[LocationDescription] = []
    highlights: List[Highlight] = []
    locale: str | None = "en"
    language: str | None = "en"
    price: Price
    metaDescription: str | None = None
    seoTitle: str | None = None
    sharingConfigTitle: str | None = None
    breadcrumbs: List[Breadcrumb] | None = None
    location: str | None = None
    locationSubtitle: str | None = None
    htmlDescription: HtmlDescription | None = None
    brandHighlights: BrandHighlights | None = None
    cancellationPolicies: List[CancellationPolicy] | None = None
    checkIn: str | None = None
    checkOut: str | None = None
    timestamp: str | None = None
    
    # Add model_config to allow extra fields
    model_config = {
        "extra": "ignore"
    } 