// filters.ts - Centralized filter definitions for the search functionality
// This file organizes all filter options and structures in a scalable way

import type { PreferenceStrength, SearchParams, AppliedFilters } from './types';

// ====== Common Types ======

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
  multiSelect: boolean;
  showStrength: boolean;
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

// ====== Property Style Filters ======

export const propertyStyles: FilterOption[] = [
  { id: 'modern', label: 'Modern', icon: 'square' },
  { id: 'rustic', label: 'Rustic', icon: 'pilcrow' },
  { id: 'cozy', label: 'Cozy', icon: 'coffee' },
  { id: 'minimalist', label: 'Minimalist', icon: 'minus-square' },
  { id: 'traditional', label: 'Traditional', icon: 'landmark' },
  { id: 'bohemian', label: 'Bohemian', icon: 'palette' },
  { id: 'elegant', label: 'Elegant', icon: 'sparkles' }
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

// ====== Nearby Attractions ======

export const nearbyAttractions: FilterOption[] = [
  { id: 'beach', label: 'Beach', icon: 'umbrella-beach' },
  { id: 'gym', label: 'Gym', icon: 'dumbbell' },
  { id: 'co-working', label: 'Co-working Space', icon: 'briefcase' },
  { id: 'city-center', label: 'City Center', icon: 'map-pin' },
  { id: 'nomad-hotspots', label: 'Nomad Hotspots', icon: 'globe' },
  { id: 'cafes', label: 'Cafes', icon: 'coffee' },
  { id: 'restaurants', label: 'Restaurants', icon: 'utensils' },
  { id: 'public-transport', label: 'Public Transport', icon: 'train' }
];

// ====== View Types ======

export const viewTypes: FilterOption[] = [
  { id: 'ocean', label: 'Ocean View', icon: 'waves' },
  { id: 'mountain', label: 'Mountain View', icon: 'mountain' },
  { id: 'city', label: 'City View', icon: 'building' },
  { id: 'garden', label: 'Garden View', icon: 'flower' },
  { id: 'lake', label: 'Lake View', icon: 'water' },
  { id: 'park', label: 'Park View', icon: 'trees' },
  { id: 'landmark', label: 'Landmark View', icon: 'monument' }
];

// ====== Privacy Levels ======

export const privacyLevels: FilterOption[] = [
  { id: 'entire-place', label: 'Entire Place', icon: 'home' },
  { id: 'private-room', label: 'Private Room', icon: 'door-closed' },
  { id: 'shared-room', label: 'Shared Room', icon: 'users' }
];

// ====== Surroundings ======

export const surroundings: FilterOption[] = [
  { id: 'quiet', label: 'Quiet', icon: 'volume-x' },
  { id: 'lively', label: 'Lively', icon: 'music' },
  { id: 'residential', label: 'Residential', icon: 'home' },
  { id: 'tourist-area', label: 'Tourist Area', icon: 'camera' }
];

// ====== Safety Ratings ======

export const safetyRatings: FilterOption[] = [
  { id: 'very-safe', label: 'Very Safe', icon: 'shield-check' },
  { id: 'safe', label: 'Safe', icon: 'shield' },
  { id: 'average', label: 'Average', icon: 'shield-off' }
];

// ====== Review Filters ======

export const reviewConsideration: FilterOption[] = [
  { id: 'weak', label: 'Weak Consideration', icon: 'star-half' },
  { id: 'normal', label: 'Normal Consideration', icon: 'star' },
  { id: 'strong', label: 'Strong Consideration', icon: 'star-plus' }
];

export const verifiedStayStatus: FilterOption[] = [
  { id: 'verified', label: 'Verified Stays Only', icon: 'badge-check' },
  { id: 'all-reviews', label: 'All Reviews', icon: 'message-square' }
];

export const reviewTimeframe: FilterOption[] = [
  { id: '3-months', label: 'Last 3 Months', icon: 'calendar' },
  { id: '6-months', label: 'Last 6 Months', icon: 'calendar' },
  { id: '12-months', label: 'Last 12 Months', icon: 'calendar' },
  { id: 'all-time', label: 'All Time', icon: 'calendar' }
];

// ====== Flooring Types ======

export const flooringTypes: FilterOption[] = [
  { id: 'tiles', label: 'Tiles', icon: 'grid' },
  { id: 'wood', label: 'Wood', icon: 'trees' },
  { id: 'marble', label: 'Marble', icon: 'circle' },
  { id: 'carpet', label: 'Carpet', icon: 'square' },
  { id: 'concrete', label: 'Concrete', icon: 'box' },
  { id: 'laminate', label: 'Laminate', icon: 'layers' }
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
    multiSelect: true,
    showStrength: true
  },
  {
    id: 'property-style',
    name: 'Property Style',
    icon: 'paintbrush',
    description: 'What style of property do you prefer?',
    options: propertyStyles,
    multiSelect: true,
    showStrength: true
  },
  {
    id: 'amenities',
    name: 'Amenities',
    icon: 'coffee',
    description: 'Must-have features for your stay',
    options: amenities,
    multiSelect: true,
    showStrength: true
  },
  {
    id: 'nearby',
    name: 'Nearby Attractions',
    icon: 'compass',
    description: 'What would you like to be close to?',
    options: nearbyAttractions,
    multiSelect: true,
    showStrength: true
  },
  {
    id: 'view-type',
    name: 'View Type',
    icon: 'eye',
    description: 'What view would you prefer?',
    options: viewTypes,
    multiSelect: true,
    showStrength: true
  },
  {
    id: 'privacy-level',
    name: 'Privacy Level',
    icon: 'lock',
    description: 'What level of privacy do you need?',
    options: privacyLevels,
    multiSelect: true,
    showStrength: true
  },
  {
    id: 'surroundings',
    name: 'Surroundings',
    icon: 'globe',
    description: 'What kind of neighborhood do you prefer?',
    options: surroundings,
    multiSelect: true,
    showStrength: true
  },
  {
    id: 'safety-rating',
    name: 'Safety Rating',
    icon: 'shield',
    description: 'Minimum safety rating based on neighborhood statistics',
    options: safetyRatings,
    multiSelect: true,
    showStrength: true
  },
  {
    id: 'review-consideration',
    name: 'Review Consideration',
    icon: 'star',
    description: 'How much weight to give to reviews?',
    options: reviewConsideration,
    multiSelect: true,
    showStrength: true
  },
  {
    id: 'verified-stay',
    name: 'Verified Stay',
    icon: 'check-circle',
    description: 'Filter by verified stays only?',
    options: verifiedStayStatus,
    multiSelect: true,
    showStrength: true
  },
  {
    id: 'review-timeframe',
    name: 'Review Timeframe',
    icon: 'calendar',
    description: 'How recent should reviews be?',
    options: reviewTimeframe,
    multiSelect: true,
    showStrength: true
  },
  {
    id: 'flooring',
    name: 'Flooring Type',
    icon: 'grid',
    description: 'What type of flooring do you prefer?',
    options: flooringTypes,
    multiSelect: true,
    showStrength: true
  },
  {
    id: 'accessibility',
    name: 'Accessibility',
    icon: 'wheelchair',
    description: 'Accessibility features',
    options: accessibilityFeatures,
    multiSelect: true,
    showStrength: true
  },
  {
    id: 'safety-features',
    name: 'Safety Features',
    icon: 'alert-triangle',
    description: 'Safety features',
    options: safetyFeatures,
    multiSelect: true,
    showStrength: true
  },
  {
    id: 'house-rules',
    name: 'House Rules',
    icon: 'book',
    description: 'Policies and permissions',
    options: houseRules,
    multiSelect: true,
    showStrength: true
  },
  {
    id: 'rating',
    name: 'Rating',
    icon: 'star',
    description: 'Minimum guest rating',
    options: ratingFilters,
    multiSelect: true,
    showStrength: true
  }
];

// A map of filter groups by ID for easy lookup
export const filterGroupsById = filterGroups.reduce((acc, group) => {
  acc[group.id] = group;
  return acc;
}, {} as Record<string, FilterGroup>);

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
  selectedRating = undefined,
  preferenceStrength
}: {
  destination: string;
  dateRange: string;
  budget: string;
  selectedRooms: number;
  preferences: string;
  selectedPropertyType: string[] | null;
  selectedAmenities: string[];
  selectedLocationFeatures?: string[];
  selectedAccessibility?: string[];
  selectedSafetyFeatures?: string[];
  selectedHouseRules?: string[];
  selectedRating?: string[];
  preferenceStrength: Record<string, PreferenceStrength>;
}): string {
  const filters: AppliedFilters = {
    propertyType: selectedPropertyType,
    amenities: selectedAmenities,
    locationFeatures: selectedLocationFeatures,
    accessibility: selectedAccessibility,
    safetyFeatures: selectedSafetyFeatures,
    houseRules: selectedHouseRules,
    rating: selectedRating,
    preferenceStrength: preferenceStrength
  };

  const searchParams: SearchParams = {
    query: destination,
    dateRange: dateRange,
    priceRange: {
      min: parseInt(budget) || 200,
      max: parseInt(budget) * 1.5 || 600
    },
    guests: {
      adults: 2,
      children: 0
    },
    filters,
    preferences
  };
  
  return JSON.stringify(searchParams);
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

/**
 * Get a list of all available filters across all groups
 * @returns An array of all filter options
 */
export function getAllFilterOptions(): FilterOption[] {
  return filterGroups.flatMap(group => group.options);
}

/**
 * Check if a filter should allow multiple selections
 * @param groupId The filter group ID
 * @returns boolean indicating if multi-select is enabled
 */
export function isMultiSelectFilter(groupId: string): boolean {
  const group = filterGroupsById[groupId];
  return group?.multiSelect || false;
}

/**
 * Check if a filter should show preference strength options
 * @param groupId The filter group ID
 * @returns boolean indicating if strength selection is enabled
 */
export function showsStrengthOptions(groupId: string): boolean {
  const group = filterGroupsById[groupId];
  return group?.showStrength || false;
}
