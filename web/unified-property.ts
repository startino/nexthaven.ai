// Unified Property Structure for Front-end
export interface UnifiedProperty {
  // Basic Information
  id: string;                    // Unique identifier (could be from Booking or Airbnb)
  source: 'Booking.com' | 'Airbnb';  // Source platform
  url: string;                   // Original listing URL
  
  // Property Details
  name: string;                  // Property name/title
  description: string;           // Full description
  
  // Location Information
  location: string;

  // Pricing Information
  pricing: {
    total: number;
  };
  
  // Capacity and Layout
  capacity: {
    bedrooms: number;
    beds: number;
  };
  
  // Property Features
  features: {
    size?: number; // In square meters
    amenities: string[];
  };
  
  // Media
  media: {
    main_image: string;          // Changed from mainImage to match backend
    gallery: string[];           // Array of additional image URLs
  };

  score: number;               // AI-generated score (changed from string to number)
  reasoning: string;           // AI reasoning for the score
  
  // Raw Data (for debugging or advanced use)
  raw_data?: any;              // Changed from rawData to match backend
}