import type { GA4Config, AnalyticsEvents, AnalyticsParams } from '../types/analytics';

export const GA4_CONFIG: GA4Config = {
  ENABLED: true,
  MEASUREMENT_ID: 'GTM-WV8LTTTJ',
  DEBUG_MODE: false,
};

export const ANALYTICS_EVENTS: AnalyticsEvents = {
  PAGE_VIEW: 'page_view',
  SEARCH_STARTED: 'search_started',
  PROPERTY_LIKED: 'property_liked',
  PROPERTY_DISLIKED: 'property_disliked',
  PROPERTY_SELECTED: 'property_selected',
  BOOKING_CLICKED: 'booking_clicked',
};

export const ANALYTICS_PARAMS: AnalyticsParams = {
  SCREEN: 'screen',
  STEP: 'step',
  QUERY: 'query',
  BUDGET: 'budget',
  ROOMS: 'rooms',
  ADULTS: 'adults',
  PROPERTY_ID: 'property_id',
  PROPERTY_NAME: 'property_name',
  PROPERTY_PRICE: 'property_price',
  PROPERTY_SCORE: 'property_score',
}; 