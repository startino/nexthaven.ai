# nexthaven.ai Application Documentation

## Overview
nexthaven.ai is a sophisticated property rental search platform that leverages AI to provide personalized luxury accommodation recommendations. The application focuses on high-end rentals and provides an intuitive, visually appealing interface for users to find their ideal temporary residence.

## Core Features

### 1. Search & Filtering System
- **Location-based Search**: Users can specify their desired location
- **Date Range**: Flexible date input supporting various formats
- **Guest Capacity**: Specification of number of guests
- **Budget Range**: 
  - Minimum and maximum monthly budget
  - All prices in USD
- **Preference Specification**: 
  - Free-form text input for specific requirements
  - Supports amenities, style preferences, and special requirements

### 2. AI-Powered Property Matching
- **Intelligent Processing**:
  - Analyzes user preferences and requirements
  - Considers both explicit criteria and implicit preferences
  - Returns top 6 best-matched properties
- **Required Search Parameters**:
  - Location
  - Date range
  - Budget range
  - Additional preferences (optional)

### 3. Property Comparison
- **Visual Comparison Interface**:
  - Grid layout of matched properties
  - Quick-view property cards
  - Detailed property modal view
- **Property Information Display**:
  - Monthly price
  - Location
  - Number of bedrooms
  - Number of bathrooms
  - Square footage
  - Detailed description
  - Available amenities
- **Image Categories**:
  - Living area
  - Bedrooms
  - Bathrooms
  - Kitchen
- **Selection Process**:
  - Interactive property cards
  - Detailed view available for each property
  - Winner selection capability

### 4. Property Details
Each property listing includes:
- **Basic Information**:
  - Unique identifier
  - Price per month
  - Location
  - Square footage
  - Number of beds/baths
- **Detailed Features**:
  - Comprehensive property description
  - List of amenities
  - Multiple categorized images
- **Visual Content**:
  - High-quality property images
  - Categorized by room type
  - Multiple views per category

### 5. Booking Integration
- **Booking.com Integration**:
  - Direct linking to property listings
  - Seamless transition to booking platform
  - Preservation of search criteria
- **Booking Process**:
  - Winner selection celebration animation
  - Transition to booking screen
  - External booking link generation
  - Clear next steps guidance

### 6. User Interface Features
- **Navigation**:
  - Intuitive flow between screens
  - Back navigation capability
  - Progress indication
- **Animations**:
  - Smooth transitions between screens
  - Loading animations
  - Selection celebrations
- **Responsive Design**:
  - Mobile-friendly interface
  - Adaptive layouts
  - Touch-friendly interactions

### 7. History & Campaign Management
- **Search History**:
  - Previous search campaigns storage
  - Date-stamped entries
  - Location information
  - Property thumbnails
- **Campaign Review**:
  - Access to previous searches
  - Property shortlist review
  - Search criteria review

## Technical Integration Requirements

### API Integration Points
1. **Property Search**:
   - Location-based querying
   - Date range availability
   - Price range filtering
   - Amenity filtering

2. **Property Details**:
   - Full property information retrieval
   - Image gallery access
   - Amenity lists
   - Pricing details

3. **Booking Integration**:
   - Direct booking URL generation
   - Property availability checking
   - Price confirmation
   - Booking handoff

### Data Requirements
1. **Property Listing Data**:
   ```typescript
   interface Property {
     id: number;
     summary_image: string;
     images: {
       living: string[];
       bedroom: string[];
       bathroom: string[];
       kitchen: string[];
     };
     price: string;
     location: string;
     beds: number;
     baths: number;
     sqft: number;
     description: string;
     amenities: string[];
   }
   ```

2. **Search Query Structure**:
   ```typescript
   interface SearchQuery {
     location: string;
     dates: string;
     guests: number;
     budget: {
       min: string;
       max: string;
     };
     preferences: string;
   }
   ```

## User Flow
1. Home Screen → Start New Search
2. Search Screen → Input Requirements
3. Loading Screen → AI Processing
4. Comparison Screen → View Matches
5. Property Details → Review Options
6. Winner Selection → Celebration
7. Booking Screen → Complete Reservation

## Performance Requirements
- Maximum 1.5s loading time for AI processing
- Immediate response for UI interactions
- Smooth animations (60fps)
- Optimized image loading
- Responsive layout adaptation

This documentation serves as a foundation for integrating with Booking.com's API, outlining all necessary touchpoints and data requirements for a seamless integration.