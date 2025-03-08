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
    url: str = Field(default="", description="URL of the property. This should be the same as the one provided as input in the property model.")
    image: str = Field(default="", description="Image of the property")
    name: str = Field(default="", description="Name of the property")
    price: float = Field(default=0, description="Total price of the property for the entire stay")
    location: str = Field(default="", description="Location of the property")
    rooms: int = Field(default=0, description="Number of rooms in the property")
    baths: int = Field(default=0, description="Number of bathrooms in the property")
    amenities: list[str] = Field(default=[], description="Amenities of the property")
    reasoning: str = Field(default="", description="Detailed reasoning behind the score, explaining how the property matches or doesn't match the user's preferences")
    score: float = Field(default=0, description="Score of the property. Must be just the number.")
    gallery: list[str] = Field(default=[], description="List of image URLs extracted from the property listing")