from pydantic import BaseModel
from src.models.requirement import Budget

class PropertyQueryRequest(BaseModel):
    """
    Request model for the query endpoint that starts the property search.
    This is used after step 2 of the form.
    """
    query: str
    date: str
    budget: Budget
    adults: int = 2
    children: int = 0
    number_of_rooms: int = 1

class PropertyEvaluationRequest(BaseModel):
    """
    Request model for the evaluate endpoint that scores properties based on preferences.
    This is used after step 3 of the form.
    """
    session_id: str
    preferences: str 