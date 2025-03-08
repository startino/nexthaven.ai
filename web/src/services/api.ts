interface Budget {
  min: number;
  max: number;
}

// Set default values for the request
interface PropertyEvaluationRequest {
  query: string; 
  date: string;
  budget: Budget;
  adults: number;
  children: number;
  number_of_rooms: number;
  // property_type: string;
  preferences: string;
}

// This interface is kept for backward compatibility but will be deprecated
export interface PropertyResult {
  id: number;
  url: string;
  name: string;
  price: number;
  location: string;
  rooms: number;
  baths: number;
  amenities: string[];
  score: string;
  reasoning: string;
  image: string;
  gallery: string[];
}

import { UnifiedProperty } from '../types/unified-property';

interface PropertyEvaluationResponse {
  status: string;
  message: string;
  count: number;
  results: UnifiedProperty[]; // Now expecting UnifiedProperty objects directly
  processing_time: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const transformRequest = (payload: PropertyEvaluationRequest) => {
  return {
    query: payload.query,
    date: payload.date,
    budget: {
        min: payload.budget.min,
        max: payload.budget.max
    },
    adults: payload.adults,
    children: payload.children,
    number_of_rooms: payload.number_of_rooms,
    // property_type: payload.property_type,
    preferences: payload.preferences,
  };
};

// This function is kept for backward compatibility but will be deprecated
const transformResponse = (property: any): PropertyResult => {
  console.log('Property from API before transform:', property);
  console.log('Image field from API:', property.image);
  
  const result = {
    id: Math.random(),
    url: property.url || '',
    name: property.name || '',
    price: property.price || 0,
    location: property.location || '',
    rooms: property.rooms || 0,
    baths: property.baths || 0,
    amenities: property.amenities || [],
    score: property.score || '0',
    reasoning: property.reasoning || '',
    image: property.image || '',
    gallery: property.gallery || [],
  };
  
  console.log('Transformed property image field:', result.image);
  
  return result;
};

export const propertyService = {
  evaluateProperties: async (
    payload: PropertyEvaluationRequest
  ): Promise<UnifiedProperty[]> => {
    try {
      console.log('Making request to:', `${API_BASE_URL}/properties/evaluate`);
      console.log('Request payload:', payload);

      const request = transformRequest(payload);
      
      const response = await fetch(`${API_BASE_URL}/properties/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response not OK:', response.status, errorText);
        throw new Error(`Property evaluation failed: ${response.status} ${errorText}`);
      }

      const data: PropertyEvaluationResponse = await response.json();
      console.log('API Response:', data);
      
      if (data.status !== 'success') {
        throw new Error(`Property evaluation failed: ${data.message}`);
      }
      
      // The API now returns UnifiedProperty objects directly, so no transformation is needed
      const unifiedProperties = data.results;
      console.log('Unified properties:', unifiedProperties);
      
      return unifiedProperties;
    } catch (error) {
      console.error('Property evaluation error:', error);
      throw error;
    }
  }
}; 