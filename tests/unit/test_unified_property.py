import pytest
from pydantic import ValidationError

from src.models.unified_property import UnifiedProperty, PricingModel, CapacityModel, FeaturesModel, MediaModel


def test_unified_property_creation():
    """Test that a valid UnifiedProperty can be created."""
    property_data = {
        "id": "test123",
        "name": "Beautiful Beach Resort",
        "description": "A beautiful beachfront property",
        "location": "Miami Beach",
        "source": "booking",
        "url": "https://example.com/property/123",
        "pricing": {
            "total": 250.0
        },
        "capacity": {
            "bedrooms": 2,
            "beds": 3
        },
        "features": {
            "amenities": ["pool", "wifi", "parking"]
        },
        "media": {
            "main_image": "https://example.com/image1.jpg",
            "gallery": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
        },
        "score": 4.5,
        "reasoning": "Great location and amenities"
    }
    
    property = UnifiedProperty(**property_data)
    
    assert property.id == "test123"
    assert property.name == "Beautiful Beach Resort"
    assert property.description == "A beautiful beachfront property"
    assert property.location == "Miami Beach"
    assert property.source == "booking"
    assert property.url == "https://example.com/property/123"
    assert property.pricing.total == 250.0
    assert property.capacity.bedrooms == 2
    assert property.capacity.beds == 3
    assert "pool" in property.features.amenities
    assert "wifi" in property.features.amenities
    assert property.media.main_image == "https://example.com/image1.jpg"
    assert len(property.media.gallery) == 2
    assert property.score == 4.5
    assert property.reasoning == "Great location and amenities"


def test_unified_property_missing_required():
    """Test that ValidationError is raised when required fields are missing."""
    # Missing required fields: id, name, price
    property_data = {
        "source": "booking",
        "url": "https://example.com/property/123",
        "location": "Miami Beach"
    }
    
    with pytest.raises(ValidationError):
        UnifiedProperty(**property_data)


def test_unified_property_invalid_values():
    """Test that ValidationError is raised when fields have invalid values."""
    # Invalid score (negative value)
    property_data = {
        "id": "test123",
        "name": "Beautiful Beach Resort",
        "description": "A beautiful beachfront property",
        "location": "Miami Beach",
        "source": "booking",
        "url": "https://example.com/property/123",
        "pricing": {
            "total": 250.0
        },
        "capacity": {
            "bedrooms": 2,
            "beds": 3
        },
        "features": {
            "amenities": ["pool", "wifi", "parking"]
        },
        "media": {
            "main_image": "https://example.com/image1.jpg",
            "gallery": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
        },
        "score": -1,  # Invalid score (negative value)
        "reasoning": "Great location and amenities"
    }
    
    with pytest.raises(ValidationError):
        UnifiedProperty(**property_data) 