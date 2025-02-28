from pydantic import BaseModel, Field

class Property(BaseModel):
    name: str
    url: str
    price: float
    rating: float
    image_url: str
    location: str
    description: str
    amenities: list[str]
    source: str
    
class Result(BaseModel):
    url: str
    name: str
    price: float
    location: str
    rooms: int
    baths: int
    amenities: list[str]
    score: str
    image: str
    gallery: list[str] = Field(default_factory=list, description="List of image URLs extracted from the property listing")
