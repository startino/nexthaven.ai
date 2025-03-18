import pytest
from pydantic import ValidationError

from src.models.request import PropertyQueryRequest, PropertyEvaluationRequest
from src.models.requirement import Budget
from src.models.unified_property import UnifiedProperty


def test_property_query_request_valid():
    """Test that a valid PropertyQueryRequest can be created."""
    request = PropertyQueryRequest(
        query="New York",
        date="2023-08-15",
        budget=Budget(min=150, max=350, currency="USD")
    )
    
    assert request.query == "New York"
    assert request.date == "2023-08-15"
    assert request.budget.min == 150
    assert request.budget.max == 350
    assert request.budget.currency == "USD"
    assert request.adults == 2  # Default value
    assert request.children == 0  # Default value
    assert request.number_of_rooms == 1  # Default value


def test_property_query_request_invalid():
    """Test that ValidationError is raised for invalid PropertyQueryRequest."""
    with pytest.raises(ValidationError):
        PropertyQueryRequest(
            query=None,  # None is not a valid string
            date="2023-08-15",
            budget=Budget(min=150, max=350, currency="USD")
        )


def test_property_evaluation_request_valid():
    """Test that a valid PropertyEvaluationRequest can be created."""
    request = PropertyEvaluationRequest(
        session_id="test-123",
        preferences="I want a quiet place with a swimming pool"
    )
    
    assert request.session_id == "test-123"
    assert request.preferences == "I want a quiet place with a swimming pool"


def test_property_evaluation_request_invalid():
    """Test that ValidationError is raised for invalid PropertyEvaluationRequest."""
    with pytest.raises(ValidationError):
        PropertyEvaluationRequest(
            session_id=None,  # None is not a valid string
            preferences="Test preferences"
        )

# Add tests for BookingApifyRequest and BookingApifyResponse
def test_booking_apify_request_valid():
    """Test that a valid BookingApifyRequest can be created."""
    from src.models.apify import BookingApifyRequest
    
    request = BookingApifyRequest(
        search="New York",
        checkIn="2023-09-01",
        checkOut="2023-09-05",
        adults=2,
        children=0,
        currency="USD",
        minMaxPrice="0-300"
    )
    
    assert request.search == "New York"
    assert request.checkIn == "2023-09-01"
    assert request.checkOut == "2023-09-05"
    assert request.adults == 2
    assert request.children == 0
    assert request.currency == "USD"
    assert request.minMaxPrice == "0-300"

def test_booking_apify_response_valid():
    """Test that a valid BookingApifyResponse can be created."""
    from src.models.apify import BookingApifyResponse, Location, Address, Room, CategoryReview, Facilities, Details
    
    # Create nested objects
    location = Location(lat=40.7128, lng=-74.0060)
    address = Address(full="123 Test Street, New York", postalCode="10001", street="Test Street", country="USA", region="NY")
    
    bed_type = Details(name="Queen Bed", additionalInfo=["Comfortable"])
    room = Room(
        available=True,
        url="https://booking.com/room/123",
        roomType="Standard",
        persons=2,
        bedTypes=[bed_type],
        facilities=["wifi", "tv"]
    )
    
    category_review = CategoryReview(title="Cleanliness", score=8.5)
    
    facility_details = Details(name="Pool", additionalInfo=["Heated"])
    facilities = Facilities(
        name="Amenities",
        overview="Hotel amenities",
        facilities=[facility_details]
    )
    
    # Create the response
    response = BookingApifyResponse(
        url="https://booking.com/hotel/123",
        name="Test Hotel",
        type="Hotel",
        description="A nice hotel in the city center",
        price=250.0,
        checkIn="14:00",
        checkOut="11:00",
        location=location,
        address=address,
        image="https://example.com/image1.jpg",
        gallery=["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
        rooms=[room],
        categoryReviews=[category_review],
        facilities=[facilities]
    )
    
    assert response.url == "https://booking.com/hotel/123"
    assert response.name == "Test Hotel"
    assert response.type == "Hotel"
    assert response.price == 250.0
    assert response.location.lat == 40.7128
    assert response.location.lng == -74.0060
    assert response.image == "https://example.com/image1.jpg"
    assert len(response.gallery) == 2
    assert len(response.rooms) == 1
    assert response.rooms[0].roomType == "Standard"

def test_airbnb_apify_response_valid():
    """Test that a valid AirbnbApifyResponse can be created."""
    from src.models.airbnb_apify import AirbnbApifyResponse, Coordinates, Host, SubDescription, Price, Rating
    
    # Create nested objects
    coordinates = Coordinates(latitude=40.7128, longitude=-74.0060)
    
    host = Host(
        id="host123",
        name="Test Host",
        isSuperHost=True,
        profileImage="https://example.com/host.jpg"
    )
    
    sub_description = SubDescription(
        title="About this place",
        items=["Great location", "Clean and tidy"]
    )
    
    price = Price(
        label="$150 night",
        amount="150",
        price="$150"
    )
    
    rating = Rating(
        cleanliness=4.8,
        communication=4.9,
        location=4.7,
        guestSatisfaction=4.8,
        reviewsCount=50
    )
    
    # Create the response
    response = AirbnbApifyResponse(
        id="airbnb_123",
        coordinates=coordinates,
        title="Cozy Apartment",
        thumbnail="https://example.com/thumbnail.jpg",
        url="https://airbnb.com/rooms/123",
        roomType="Entire home/apt",
        personCapacity=4,
        rating=rating,
        host=host,
        subDescription=sub_description,
        price=price,
        location="Downtown",
        description="A cozy apartment in downtown"
    )
    
    assert response.id == "airbnb_123"
    assert response.title == "Cozy Apartment"
    assert response.coordinates.latitude == 40.7128
    assert response.coordinates.longitude == -74.0060
    assert response.roomType == "Entire home/apt"
    assert response.personCapacity == 4
    assert response.rating.cleanliness == 4.8
    assert response.rating.reviewsCount == 50
    assert response.host.name == "Test Host"
    assert response.host.isSuperHost is True
    assert response.price.amount == "150"
    assert response.location == "Downtown" 