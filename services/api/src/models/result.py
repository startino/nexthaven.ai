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
    reasoning: str = Field(default="", description="Detailed reasoning behind the score, explaining how the property matches or doesn't match the user's preferences")
    score: float = Field(default=0, description="Score of the property. Must be just the number.")