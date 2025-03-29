// filters.ts - Centralized filter definitions for the search functionality
// This file organizes all filter options and structures in a scalable way

import type { DateRange } from './types';

// ====== Common Types ======

/** Defines the strength/importance of a preference for the user */
export type PreferenceStrength = 'weak' | 'mid' | 'strong';

/** Interface for all filter option items */
export interface FilterOption {
  id: string;
  label: string;
  icon?: string;
  description?: string;
}

/** Interface for filter option groups */
export interface FilterGroup {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  options: FilterOption[];
  multiSelect?: boolean;
  showStrength?: boolean;
}

// ====== Location Filters ======

export const popularDestinations: FilterOption[] = [
  { id: 'kuala-lumpur', label: 'Kuala Lumpur' },
  { id: 'bali', label: 'Bali' },
  { id: 'da-nang', label: 'Da Nang' },
  { id: 'bangkok', label: 'Bangkok' },
  { id: 'tokyo', label: 'Tokyo' },
  { id: 'seoul', label: 'Seoul' },
  { id: 'singapore', label: 'Singapore' },
  { id: 'hong-kong', label: 'Hong Kong' }
];

// ====== Date Filters ======

export const timeFrames: FilterOption[] = [
  { id: 'next-week', label: 'Next Week' },
  { id: 'two-weeks', label: 'Two Weeks' },
  { id: 'next-month', label: 'Next Month' }
];

export const durations: FilterOption[] = [
  { id: '1-week', label: '1 Week' },
  { id: '1-month', label: '1 Month' },
  { id: '3-months', label: '3 Months' }
];

// ====== Budget Filters ======

export const budgetRanges: FilterOption[] = [
  { id: 'economy', label: 'Economy', description: 'Under $500' },
  { id: 'mid-range', label: 'Mid-range', description: '$500-$1000' },
  { id: 'luxury', label: 'Luxury', description: '$1000+' }
];

// ====== Room Filters ======

export const roomOptions: FilterOption[] = [
  { id: '1', label: '1 Room' },
  { id: '2', label: '2 Rooms' },
  { id: '3', label: '3 Rooms' },
  { id: '4', label: '4+ Rooms' }
];

export const guestOptions: FilterOption[] = [
  { id: '1', label: '1 Guest' },
  { id: '2', label: '2 Guests' },
  { id: '3', label: '3 Guests' },
  { id: '4', label: '4 Guests' },
  { id: '5', label: '5 Guests' },
  { id: '6', label: '6+ Guests' }
];

// ====== Property Type Filters ======

export const propertyTypes: FilterOption[] = [
  { id: 'house', label: 'House', icon: 'home' },
  { id: 'apartment', label: 'Apartment', icon: 'building' },
  { id: 'villa', label: 'Villa', icon: 'castle' },
  { id: 'boutique-hotel', label: 'Boutique Hotel', icon: 'hotel' },
  { id: 'cabin', label: 'Cabin', icon: 'cabin' },
  { id: 'treehouse', label: 'Treehouse', icon: 'tree' },
  { id: 'boat', label: 'Boat', icon: 'boat' },
  { id: 'farm-stay', label: 'Farm Stay', icon: 'wheat' }
];

// ====== Amenity Filters ======

export const amenities: FilterOption[] = [
  { id: 'pool', label: 'Pool', icon: 'pool' },
  { id: 'hot-tub', label: 'Hot Tub', icon: 'hot-tub' },
  { id: 'gym', label: 'Gym', icon: 'dumbbell' },
  { id: 'parking', label: 'Parking', icon: 'car' },
  { id: 'wifi', label: 'Wifi', icon: 'wifi' },
  { id: 'kitchen', label: 'Kitchen', icon: 'utensils' },
  { id: 'air-conditioning', label: 'Air Conditioning', icon: 'snowflake' },
  { id: 'washer', label: 'Washer', icon: 'washing-machine' }
];

// ====== Location Features ======

export const locationFeatures: FilterOption[] = [
  { id: 'beach-access', label: 'Beach Access', icon: 'beach' },
  { id: 'lake-access', label: 'Lake Access', icon: 'water' },
  { id: 'ski-in-out', label: 'Ski-in/Ski-out', icon: 'skiing' },
  { id: 'waterfront', label: 'Waterfront', icon: 'waves' },
  { id: 'downtown', label: 'Downtown', icon: 'building-2' },
  { id: 'countryside', label: 'Countryside', icon: 'mountain' }
];

// ====== Accessibility Features ======

export const accessibilityFeatures: FilterOption[] = [
  { id: 'step-free-access', label: 'Step-free access', icon: 'wheelchair' },
  { id: 'wide-doorways', label: 'Wide doorways', icon: 'door-open' },
  { id: 'accessible-bathroom', label: 'Accessible bathroom', icon: 'bath' },
  { id: 'accessible-parking', label: 'Accessible parking', icon: 'parking' }
];

// ====== Safety Features ======

export const safetyFeatures: FilterOption[] = [
  { id: 'smoke-alarm', label: 'Smoke alarm', icon: 'alert-triangle' },
  { id: 'carbon-monoxide-alarm', label: 'Carbon monoxide alarm', icon: 'alert-circle' },
  { id: 'fire-extinguisher', label: 'Fire extinguisher', icon: 'flame' },
  { id: 'first-aid-kit', label: 'First aid kit', icon: 'heart' }
];

// ====== House Rules ======

export const houseRules: FilterOption[] = [
  { id: 'pets-allowed', label: 'Pets allowed', icon: 'paw' },
  { id: 'smoking-allowed', label: 'Smoking allowed', icon: 'cigarette' },
  { id: 'events-allowed', label: 'Events allowed', icon: 'party-popper' },
  { id: 'children-allowed', label: 'Children welcome', icon: 'baby' }
];

// ====== Rating Filters ======

export const ratingFilters: FilterOption[] = [
  { id: '5', label: '5 stars (Exceptional)' },
  { id: '4', label: '4+ stars (Excellent)' },
  { id: '3', label: '3+ stars (Good)' }
];

// ====== Organized Filter Groups ======

/**
 * Main filter groups that organize all filters into categories
 * This allows for easy UI generation and organized management
 */
export const filterGroups: FilterGroup[] = [
  {
    id: 'property-type',
    name: 'Property Type',
    icon: 'home',
    description: 'What type of property are you looking for?',
    options: propertyTypes,
    showStrength: true
  },
  {
    id: 'amenities',
    name: 'Amenities',
    icon: 'coffee',
    description: 'Must-have features for your stay',
    options: amenities,
    multiSelect: true
  },
  {
    id: 'location-features',
    name: 'Location',
    icon: 'map-pin',
    description: 'Special location features',
    options: locationFeatures,
    multiSelect: true
  },
  {
    id: 'accessibility',
    name: 'Accessibility',
    icon: 'wheelchair',
    description: 'Accessibility features',
    options: accessibilityFeatures,
    multiSelect: true
  },
  {
    id: 'safety',
    name: 'Safety',
    icon: 'shield',
    description: 'Safety features',
    options: safetyFeatures,
    multiSelect: true
  },
  {
    id: 'house-rules',
    name: 'House Rules',
    icon: 'book',
    description: 'Policies and permissions',
    options: houseRules,
    multiSelect: true
  },
  {
    id: 'rating',
    name: 'Rating',
    icon: 'star',
    description: 'Minimum guest rating',
    options: ratingFilters
  }
];

// ====== Filter Query Interfaces ======

/**
 * Interface that defines the structure of a search query
 * This should match what's sent to the API or used in state
 */
export interface SearchQueryData {
  query: string;
  date: string;
  budget: {
    min: number;
    max: number;
  };
  adults: number;
  children: number;
  number_of_rooms: number;
  preferences: string;
  property_type: string | null;
  amenities: string[];
  location_features?: string[];
  accessibility?: string[];
  safety_features?: string[];
  house_rules?: string[];
  rating?: string;
  property_preferences: Record<string, PreferenceStrength>;
}

// ====== Helper Functions ======

/**
 * Prepare search query from form data
 * @param params Form data parameters
 * @returns JSON string of search query
 */
export function prepareSearchQuery({
  destination,
  dateRange,
  budget,
  selectedRooms,
  preferences,
  selectedPropertyType,
  selectedAmenities,
  selectedLocationFeatures = [],
  selectedAccessibility = [],
  selectedSafetyFeatures = [],
  selectedHouseRules = [],
  selectedRating = null,
  preferenceStrength
}: {
  destination: string;
  dateRange: string;
  budget: string;
  selectedRooms: number;
  preferences: string;
  selectedPropertyType: string | null;
  selectedAmenities: string[];
  selectedLocationFeatures?: string[];
  selectedAccessibility?: string[];
  selectedSafetyFeatures?: string[];
  selectedHouseRules?: string[];
  selectedRating?: string | null;
  preferenceStrength: Record<string, PreferenceStrength>;
}): string {
  const searchQuery: SearchQueryData = {
    query: destination,
    date: dateRange,
    budget: {
      min: parseInt(budget) || 200,
      max: parseInt(budget) * 1.5 || 600
    },
    adults: 2,
    children: 0,
    number_of_rooms: selectedRooms,
    preferences: preferences,
    property_type: selectedPropertyType,
    amenities: selectedAmenities,
    location_features: selectedLocationFeatures,
    accessibility: selectedAccessibility,
    safety_features: selectedSafetyFeatures,
    house_rules: selectedHouseRules,
    rating: selectedRating,
    property_preferences: preferenceStrength
  };
  
  return JSON.stringify(searchQuery);
}

/**
 * Find a filter option by ID from any filter group
 * @param id The filter option ID to find
 * @returns The found filter option or undefined
 */
export function findFilterOptionById(id: string): FilterOption | undefined {
  for (const group of filterGroups) {
    const option = group.options.find(opt => opt.id === id);
    if (option) return option;
  }
  return undefined;
}

/**
 * Map filter IDs to their label values
 * @param ids Array of filter IDs
 * @returns Array of filter labels
 */
export function mapFilterIdsToLabels(ids: string[]): string[] {
  return ids.map(id => {
    const option = findFilterOptionById(id);
    return option ? option.label : id;
  });
}
