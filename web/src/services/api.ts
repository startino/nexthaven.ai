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
  property_type: string;
  preferences: string;
  max_results: number;
}

interface PropertyResult {
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
    property_type: payload.property_type,
    preferences: payload.preferences,
    max_results: payload.max_results,
  };
};

// class Result(BaseModel):
//     url: str
//     name: str
//     price: float
//     location: str
//     rooms: int
//     baths: int
//     amenities: list[str]
//     score: str
//     image: str
//     gallery: list[str] = Field(default_factory=list, description="List of image URLs extracted from the property listing")

const transformResponse = (property: PropertyResult): PropertyResult => {
  return {
    url: property.url,
    name: property.name,
    price: property.price,
    location: property.location,
    rooms: property.rooms,
    baths: property.baths,
    amenities: property.amenities,
    score: property.score,
    image: property.image,
    gallery: property.gallery,
  };
};

export const propertyService = {
  evaluateProperties: async (
    payload: PropertyEvaluationRequest,
    onPropertyReceived: (property: PropertyResult) => void
  ): Promise<void> => {
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

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            console.log('Raw property data:', line);
            const property = JSON.parse(line.trim());
            
            if (property.name) {
              console.log('Processing property:', property.name);
              onPropertyReceived(property);
            }
          } catch (e) {
            console.error('Error parsing property data:', line);
            console.error('Parse error:', e);
          }
        }
      }
    } catch (error) {
      console.error('Property evaluation error:', error);
      throw error;
    }
  }
}; 