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

    locationQueries: Optional[List[str]] = Field(
        default=None, description="List of location queries to scrape"
    )
    startUrls: Optional[List[Dict[str, str]]] = Field(
        default=None, description="List of Airbnb URLs to start with"
    )
    checkIn: Optional[str] = Field(
        default=None, description="Check-in date in YYYY-MM-DD format"
    )
    checkOut: Optional[str] = Field(
        default=None, description="Check-out date in YYYY-MM-DD format"
    )
    locale: str = Field(
        default="en-US",
        description="Localized results in this locale will be extracted",
    )
    currency: str = Field(
        default="USD", description="Currency that will be extracted for prices"
    )
    priceMin: Optional[int] = Field(default=None, description="Minimum price")
    priceMax: Optional[int] = Field(default=None, description="Maximum price")
    minBeds: Optional[int] = Field(default=None, description="Minimum beds")
    minBedrooms: Optional[int] = Field(default=None, description="Minimum bedrooms")
    minBathrooms: Optional[int] = Field(default=None, description="Minimum bathrooms")
    adults: Optional[int] = Field(default=None, description="Number of adults")
    children: Optional[int] = Field(default=None, description="Number of children")
    infants: Optional[int] = Field(default=None, description="Number of infants")
    pets: Optional[int] = Field(default=None, description="Number of pets")
    proxyConfiguration: Optional[Dict[str, Any]] = Field(
        default=None, description="Proxy configuration"
    )


class AirbnbCoordinates(BaseModel):
    latitude: float
    longitude: float


class Rating(BaseModel):
    accuracy: Optional[float] = None
    checking: Optional[float] = None
    cleanliness: Optional[float] = None
    communication: Optional[float] = None
    location: Optional[float] = None
    value: Optional[float] = None
    guestSatisfaction: Optional[float] = None
    reviewsCount: Optional[int] = None


class RuleValue(BaseModel):
    title: str
    icon: Optional[str] = None
    subtitle: Optional[str] = None
    available: Optional[Union[bool, str]] = None


class RuleGroup(BaseModel):
    title: str
    values: List[RuleValue]


class HouseRules(BaseModel):
    additional: Optional[str] = ""
    general: List[RuleGroup] = []


class Host(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    isSuperHost: Optional[bool] = False
    profileImage: Optional[str] = None
    highlights: List[str] = []
    about: Union[str, List[str]] = ""
    ratingCount: Optional[int] = None
    ratingAverage: Optional[float] = None
    hostDetails: Optional[List[str]] = None
    timeAsHost: Optional[Dict[str, Any]] = None
    isVerified: Optional[bool] = None


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
    basePrice: Optional[PriceBreakdownItem] = None
    basePriceBreakdown: List[PriceBreakdownItem] = []
    serviceFee: Optional[PriceBreakdownItem] = None
    totalBeforeTaxes: Optional[PriceBreakdownItem] = None
    taxes: Optional[PriceBreakdownItem] = None
    total: Optional[PriceBreakdownItem] = None
    cleaningFee: Optional[PriceBreakdownItem] = None
    specialOffer: Optional[PriceBreakdownItem] = None
    earlyBirdDiscount: Optional[PriceBreakdownItem] = None


class Price(BaseModel):
    label: Optional[str] = None
    amount: Optional[str] = None
    price: Optional[str] = None
    qualifier: Optional[str] = None
    breakDown: Optional[PriceBreakdown] = None
    originalPrice: Optional[str] = None
    discountedPrice: Optional[str] = None


class Image(BaseModel):
    caption: Optional[str] = None
    imageUrl: Optional[str] = None
    orientation: Optional[str] = None


class HtmlDescription(BaseModel):
    htmlText: Optional[str] = None
    recommendedNumberOfLines: Optional[int] = None


class Breadcrumb(BaseModel):
    linkRoute: Optional[str] = None
    linkText: Optional[str] = None
    searchText: Optional[str] = None


class BrandHighlights(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    hasGoldenLaurel: Optional[bool] = None


class CancellationPolicy(BaseModel):
    title: Optional[str] = None
    policyName: Optional[str] = None
    policyId: Optional[int] = None


class AirbnbApifyResponse(BaseModel):
    """
    Response model for the Airbnb Apify scraper.
    """

    id: str
    coordinates: AirbnbCoordinates
    description: Optional[str] = ""
    descriptionOriginalLanguage: Optional[str] = None
    title: str
    thumbnail: Optional[str] = ""
    url: str
    androidLink: Optional[str] = None
    iosLink: Optional[str] = None
    roomType: Optional[str] = ""
    propertyType: Optional[str] = None
    isSuperHost: Optional[bool] = False
    homeTier: Optional[int] = None
    personCapacity: Optional[int] = 0
    rating: Optional[Rating] = None
    houseRules: Optional[HouseRules] = None
    host: Host
    subDescription: SubDescription
    amenities: List[AmenityGroup] = []
    coHosts: List[Any] = []
    images: List[Image] = []
    locationDescriptions: List[LocationDescription] = []
    highlights: List[Highlight] = []
    locale: Optional[str] = "en"
    language: Optional[str] = "en"
    price: Price
    metaDescription: Optional[str] = None
    seoTitle: Optional[str] = None
    sharingConfigTitle: Optional[str] = None
    breadcrumbs: Optional[List[Breadcrumb]] = None
    location: Optional[str] = None
    locationSubtitle: Optional[str] = None
    htmlDescription: Optional[HtmlDescription] = None
    brandHighlights: Optional[BrandHighlights] = None
    cancellationPolicies: Optional[List[CancellationPolicy]] = None
    checkIn: Optional[str] = None
    checkOut: Optional[str] = None
    timestamp: Optional[str] = None

    # Add model_config to allow extra fields
    model_config = {"extra": "ignore"}
