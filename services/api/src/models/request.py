from pydantic import BaseModel, Field
from src.models.requirement import Budget

class PropertyQueryRequest(BaseModel):
    """
    Request model for the query endpoint that starts the property search.
    This is used after step 2 of the form.
    """
    query: str
    date: str
    budget: Budget
    adults: int = Field(default=2, ge=1, description="Number of adults, must be at least 1")
    children: int = Field(default=0, ge=0, description="Number of children, must be non-negative")
    number_of_rooms: int = Field(default=1, ge=1, description="Number of rooms, must be at least 1")

class PropertyEvaluationRequest(BaseModel):
    """
    Request model for the evaluate endpoint that scores properties based on preferences.
    This is used after step 3 of the form.
    """
    session_id: str
    preferences: str 