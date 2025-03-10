interface Budget {
  min: number;
  max: number;
}

// Base request interface with common properties
interface BasePropertyRequest {
  query: string; 
  date: string;
  budget: Budget;
  adults: number;
  children: number;
  number_of_rooms: number;
}

// Request for the query endpoint (step 2)
interface PropertyQueryRequest extends BasePropertyRequest {}

// Request for the evaluate endpoint (step 3)
interface PropertyEvaluationRequest {
  session_id: string;
  preferences: string;
}

// Legacy request interface (kept for backward compatibility)
interface LegacyPropertyEvaluationRequest extends BasePropertyRequest {
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

// Response from the query endpoint
interface PropertyQueryResponse {
  status: string;
  message: string;
  session_id: string;
}

// Response from the status endpoint
interface PropertyQueryStatusResponse {
  status: string;
  message?: string;
  started_at?: number;
  completed?: boolean;
  completed_at?: number;
  properties_count?: number;
  error?: string;
}

// Response from the evaluate endpoint
interface PropertyEvaluationResponse {
  status: string;
  message: string;
  count: number;
  results: UnifiedProperty[]; // Now expecting UnifiedProperty objects directly
  processing_time: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Transform functions for different request types
const transformQueryRequest = (payload: PropertyQueryRequest) => {
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
  };
};

const transformEvaluationRequest = (sessionId: string, preferences: string) => {
  return {
    session_id: sessionId,
    preferences: preferences,
  };
};

// Legacy transform function (kept for backward compatibility)
const transformLegacyRequest = (payload: LegacyPropertyEvaluationRequest) => {
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
  // Start property query (after step 2)
  queryProperties: async (
    payload: PropertyQueryRequest
  ): Promise<string> => {
    try {
      console.log('Making request to:', `${API_BASE_URL}/properties/query`);
      console.log('Request payload:', payload);

      const request = transformQueryRequest(payload);
      
      const response = await fetch(`${API_BASE_URL}/properties/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response not OK:', response.status, errorText);
        throw new Error(`Property query failed: ${response.status} ${errorText}`);
      }

      const data: PropertyQueryResponse = await response.json();
      console.log('API Response:', data);
      
      if (data.status !== 'processing') {
        throw new Error(`Property query failed: ${data.message}`);
      }
      
      return data.session_id;
    } catch (error) {
      console.error('Property query error:', error);
      throw error;
    }
  },
  
  // Evaluate properties with preferences
  evaluatePropertiesWithPreferences: async (
    sessionId: string,
    preferences: string
  ): Promise<UnifiedProperty[]> => {
    try {
      console.log('Making request to:', `${API_BASE_URL}/properties/evaluate`);
      console.log('Request payload:', { session_id: sessionId, preferences });

      const request = transformEvaluationRequest(sessionId, preferences);
      
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
        
        // Try to parse the error message if it's JSON
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(`Property evaluation failed: ${errorJson.detail || errorJson.message || response.status}`);
        } catch (e) {
          // If parsing fails, use the raw error text
          throw new Error(`Property evaluation failed: ${response.status} ${errorText}`);
        }
      }

      const data: PropertyEvaluationResponse = await response.json();
      console.log('API Response:', data);
      
      if (data.status !== 'success') {
        throw new Error(`Property evaluation failed: ${data.message}`);
      }
      
      return data.results;
    } catch (error) {
      console.error('Property evaluation error:', error);
      throw error;
    }
  },
  
  // Legacy method (kept for backward compatibility)
  evaluateProperties: async (
    payload: LegacyPropertyEvaluationRequest
  ): Promise<UnifiedProperty[]> => {
    try {
      console.log('Making request to:', `${API_BASE_URL}/properties/evaluate`);
      console.log('Request payload:', payload);

      const request = transformLegacyRequest(payload);
      
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
        
        // Try to parse the error message if it's JSON
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(`Property evaluation failed: ${errorJson.detail || errorJson.message || response.status}`);
        } catch (e) {
          // If parsing fails, use the raw error text
          throw new Error(`Property evaluation failed: ${response.status} ${errorText}`);
        }
      }

      const data: PropertyEvaluationResponse = await response.json();
      console.log('API Response:', data);
      
      if (data.status !== 'success') {
        throw new Error(`Property evaluation failed: ${data.message}`);
      }
      
      return data.results;
    } catch (error) {
      console.error('Property evaluation error:', error);
      throw error;
    }
  }
}; 