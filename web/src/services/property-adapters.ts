import { UnifiedProperty } from '../../unified-property';
import { PropertyResult } from './api';

/**
 * NOTE: This file is kept for reference but is no longer actively used in the application.
 * The backend now returns UnifiedProperty objects directly, so these adapter functions are not needed.
 * They may be useful for testing or if we need to support legacy API responses in the future.
 */

/**
 * Adapts a property from the Booking.com API to the unified property format
 */
export function adaptBookingProperty(property: any): UnifiedProperty {
  return {
    id: property.id?.toString() || Math.random().toString(),
    source: 'Booking.com',
    url: property.url || '',
    name: property.name || '',
    description: property.description || '',
    location: property.location || '',
    pricing: {
      total: Math.round(property.price) || 0,
    },
    capacity: {
      bedrooms: property.rooms || 0,
      beds: property.rooms || 0, // Assuming beds count is not available
    },
    features: {
      size: undefined,
      amenities: property.amenities || [],
    },
    media: {
      main_image: property.image || '',
      gallery: property.gallery || [],
    },
    score: typeof property.score === 'string' ? parseFloat(property.score) || 0 : (property.score || 0),
    reasoning: property.reasoning || '',
    raw_data: property,
  };
}

/**
 * Adapts a property from the Airbnb API to the unified property format
 */
export function adaptAirbnbProperty(property: any): UnifiedProperty {
  return {
    id: property.id?.toString() || Math.random().toString(),
    source: 'Airbnb',
    url: property.url || '',
    name: property.name || '',
    description: property.description || '',
    location: property.location || '',
    pricing: {
      total: Math.round(property.price) || 0,
    },
    capacity: {
      bedrooms: property.rooms || 0,
      beds: property.rooms || 0, // Assuming beds count is not available
    },
    features: {
      size: undefined,
      amenities: property.amenities || [],
    },
    media: {
      main_image: property.image || '',
      gallery: property.gallery || [],
    },
    score: typeof property.score === 'string' ? parseFloat(property.score) || 0 : (property.score || 0),
    reasoning: property.reasoning || '',
    raw_data: property,
  };
}

/**
 * Adapts a PropertyResult to the unified property format
 */
export function adaptPropertyResult(property: PropertyResult): UnifiedProperty {
  return {
    id: property.id?.toString() || Math.random().toString(),
    source: 'Booking.com', // Default to booking as the source
    url: property.url || '',
    name: property.name || '',
    description: '', // PropertyResult doesn't have a description
    location: property.location || '',
    pricing: {
      total: Math.round(property.price) || 0,
    },
    capacity: {
      bedrooms: property.rooms || 0,
      beds: property.rooms || 0, // Assuming beds count is not available
    },
    features: {
      size: undefined,
      amenities: property.amenities || [],
    },
    media: {
      main_image: property.image || '',
      gallery: property.gallery || [],
    },
    score: typeof property.score === 'string' ? parseFloat(property.score) || 0 : (property.score || 0),
    reasoning: property.reasoning || '',
    raw_data: property,
  };
}

/**
 * Determines the source of a property based on its structure and adapts it accordingly
 */
export function adaptProperty(property: any): UnifiedProperty {
  // Check if it's a PropertyResult
  if (property.hasOwnProperty('id') && 
      property.hasOwnProperty('url') && 
      property.hasOwnProperty('name') && 
      property.hasOwnProperty('price') && 
      property.hasOwnProperty('location')) {
    return adaptPropertyResult(property as PropertyResult);
  }
  
  // Check if it's from Airbnb (this is a simplified check, you may need to enhance it)
  if (property.hasOwnProperty('source') && property.source === 'Airbnb') {
    return adaptAirbnbProperty(property);
  }
  
  // Default to Booking.com
  return adaptBookingProperty(property);
} 