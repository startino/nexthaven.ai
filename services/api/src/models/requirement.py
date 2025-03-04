from pydantic import BaseModel, Field
from datetime import datetime
class Budget(BaseModel):
    min: int = Field(default=0, description="Minimum budget for the property")
    max: int = Field(default=0, description="Maximum budget for the property")

class DateRange(BaseModel):
    start_date: str = Field(default="", description="Start date for the property in YYYY-MM-DD format")
    end_date: str = Field(default="", description="End date for the property in YYYY-MM-DD format")

class UserRequirement(BaseModel):
    query: str = Field(default="", description="Query for the property")
    date: str = Field(default="", description="Date for the property in text format")
    budget: Budget = Field(default=Budget(), description="Budget for the property")
    adults: int = Field(default=0, description="Adults count for the property")
    children: int = Field(default=0, description="Children count for the property")
    number_of_rooms: int = Field(default=0, description="Number of rooms for the property")
    property_type: str = Field(default="", description="Property type for the property")
    preferences: str = Field(default="", description="Specific preferences for the property in textual form")
    
class GeneratedRequirement(BaseModel):
    query: str = Field(default="", description="Query for the property")
    date_range: DateRange = Field(default=DateRange(), description="Date range for the property")
    budget: Budget = Field(default=Budget(), description="Budget for the property")
    adults: int = Field(default=0, description="Adults count for the property")
    children: int = Field(default=0, description="Children count for the property")
    number_of_rooms: int = Field(default=0, description="Number of rooms for the property")
    property_type: str = Field(default="", description="Property type for the property")
    preferences: list[str] = Field(default=[], description="List of preferences for the property")
        
        