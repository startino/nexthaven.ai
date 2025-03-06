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
  image: string;
  gallery: string[];
}

interface PropertyEvaluationResponse {
  status: string;
  message: string;
  count: number;
  results: PropertyResult[];
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

const transformResponse = (property: any): PropertyResult => {
  return {
    id: Math.random(),
    url: property.url || '',
    name: property.name || '',
    price: property.price || 0,
    location: property.location || '',
    rooms: property.rooms || 0,
    baths: property.baths || 0,
    amenities: property.amenities || [],
    score: property.score || '0',
    image: property.image || '',
    gallery: property.gallery || [],
  };
};

export const propertyService = {
  evaluateProperties: async (
    payload: PropertyEvaluationRequest
  ): Promise<PropertyResult[]> => {
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
      
      // Transform each property in the results array
      const transformedResults = data.results.map(property => transformResponse(property));
      console.log('Transformed results:', transformedResults);
      
      return transformedResults;
    } catch (error) {
      console.error('Property evaluation error:', error);
      throw error;
    }
  }
}; 