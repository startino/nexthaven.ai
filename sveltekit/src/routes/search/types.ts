// types.ts - Centralized type definitions for search functionality

/** 
 * Date range representation with start and end dates
 */
export interface DateRange {
  startDate: string;
  endDate: string;
}

/**
 * Search query parameters as sent to the server
 */
export interface SearchParams {
  query: string;
  dateRange: string | {
    startDate: string;
    endDate: string;
  };
  priceRange: PriceRange;
  guests: Guests;
  filters: AppliedFilters;
  preferences: string;
}

/**
 * Price range configuration
 */
export interface PriceRange {
  min: number;
  max: number;
  currency?: string;
}

/**
 * Guest configuration
 */
export interface Guests {
  adults: number;
  children: number;
  infants?: number;
  pets?: number;
}

/**
 * Applied filters collection
 */
export interface AppliedFilters {
  propertyType: string[] | null;
  amenities: string[];
  locationFeatures?: string[];
  accessibility?: string[];
  safetyFeatures?: string[];
  houseRules?: string[];
  rating?: string[];
  propertyStyle?: string[];
  nearby?: string[];
  viewType?: string[];
  privacyLevel?: string[];
  surroundings?: string[];
  safetyRating?: string[];
  reviewConsideration?: string[];
  verifiedStay?: string[];
  reviewTimeframe?: string[];
  flooring?: string[];
  preferenceStrength: Record<string, PreferenceStrength>;
}

/**
 * Preference strength values
 */
export type PreferenceStrength = 'weak' | 'mid' | 'strong';

/**
 * Property search result
 */
export interface PropertyResult {
  id: string;
  title: string;
  description: string;
  location: string;
  price: number;
  currency: string;
  images: string[];
  rating: number;
  reviewCount: number;
  amenities: string[];
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  host: {
    id: string;
    name: string;
    image?: string;
    rating?: number;
  };
}

/**
 * Saved preferences
 */
export interface SavedPreference {
  id: string;
  text: string;
  timestamp: number;
}

/**
 * Search history item
 */
export interface SearchHistoryItem {
  id: string;
  query: string;
  date: string;
  timestamp: number;
  results?: number;
} 