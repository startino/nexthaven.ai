export interface GA4Config {
  ENABLED: boolean;
  MEASUREMENT_ID: string;
  DEBUG_MODE: boolean;
}

export interface AnalyticsEvents {
  PAGE_VIEW: string;
  SEARCH_STARTED: string;
  PROPERTY_LIKED: string;
  PROPERTY_DISLIKED: string;
  PROPERTY_SELECTED: string;
  BOOKING_CLICKED: string;
}

export interface AnalyticsParams {
  SCREEN: string;
  STEP: string;
  QUERY: string;
  BUDGET: string;
  ROOMS: string;
  ADULTS: string;
  PROPERTY_ID: string;
  PROPERTY_NAME: string;
  PROPERTY_PRICE: string;
  PROPERTY_SCORE: string;
} 