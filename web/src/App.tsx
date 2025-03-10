import React, { useState, useEffect } from 'react';
import SearchScreen from './components/SearchScreen';
import SwipeScreen from './components/SwipeScreen';
import ComparisonScreen from './components/ComparisonScreen';
import HomeScreen from './components/HomeScreen';
import HistoryScreen from './components/HistoryScreen';
import LoadingScreen from './components/LoadingScreen';
import BookingScreen from './components/BookingScreen';
import { propertyService } from './services/api';
import { UnifiedProperty } from './types/unified-property';
import { GA4_CONFIG, ANALYTICS_EVENTS, ANALYTICS_PARAMS } from './config/analytics';
import { updateBrowserUrl } from './utils/url';

// Define Screen type
type Screen = 'home' | 'search' | 'loading' | 'compare' | 'history' | 'booking';

// This function is no longer needed as we're using UnifiedProperty directly
// const transformResponse = (property: PropertyResult): PropertyResult => {
//   return {
//     id: property.id,
//     url: property.url,
//     name: property.name,
//     price: property.price,
//     location: property.location,
//     rooms: property.rooms,
//     baths: property.baths,
//     amenities: property.amenities,
//     score: property.score,
//     image: property.image,
//     gallery: property.gallery,
//   };
// };

function App() {
  // Initialize state from URL parameters if available
  const getInitialScreen = (): Screen => {
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page');
    if (page && ['home', 'search', 'loading', 'compare', 'history', 'booking'].includes(page)) {
      return page as Screen;
    }
    return 'home';
  };

  const [screen, setScreen] = useState<Screen>(getInitialScreen());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<UnifiedProperty | null>(null);
  const [topProperties, setTopProperties] = useState<UnifiedProperty[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Update URL and track page views
  useEffect(() => {
    // Create parameters for the URL
    const urlParams: Record<string, string> = {};

    // Update browser URL
    updateBrowserUrl(screen, urlParams);

    // Send pageview to GA4
    if (GA4_CONFIG.ENABLED) {
      // Create analytics-specific parameters
      const analyticsParams = new URLSearchParams();
      analyticsParams.set(ANALYTICS_PARAMS.SCREEN, screen);
      
      if (screen === 'search' && searchQuery) {
        analyticsParams.set(ANALYTICS_PARAMS.QUERY, searchQuery);
      }

      if (screen === 'booking' && selectedProperty) {
        analyticsParams.set(ANALYTICS_PARAMS.PROPERTY_ID, String(selectedProperty.id));
        analyticsParams.set(ANALYTICS_PARAMS.PROPERTY_NAME, selectedProperty.name);
        analyticsParams.set(ANALYTICS_PARAMS.PROPERTY_PRICE, String(selectedProperty.pricing.total));
      }

      window.gtag?.('config', GA4_CONFIG.MEASUREMENT_ID, {
        debug_mode: GA4_CONFIG.DEBUG_MODE,
        page_path: `/${screen}?${analyticsParams.toString()}`,
        page_title: `nexthaven.ai - ${screen}`,
        page_location: window.location.href,
      });

      // Track screen view event
      window.gtag?.('event', ANALYTICS_EVENTS.PAGE_VIEW, {
        screen_name: screen,
        ...Object.fromEntries(analyticsParams)
      });
    }
  }, [screen, searchQuery, selectedProperty, topProperties]);
  
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setScreen('loading');
    setTopProperties([]); // Clear previous results
    setError(null); // Clear any previous errors
    
    try {
      console.log('Received search query:', query);
      const parsedQuery = JSON.parse(query);
      console.log('Parsed query:', parsedQuery);
      
      let properties: UnifiedProperty[] = [];
      
      // Check if we're using the new flow with session_id
      if (parsedQuery.sessionId) {
        console.log('Using new API flow with session ID:', parsedQuery.sessionId);
        // Use the new API endpoint
        properties = await propertyService.evaluatePropertiesWithPreferences(
          parsedQuery.sessionId,
          parsedQuery.preferences
        );
      } else {
        console.log('Using legacy API flow');
        // Use the legacy API endpoint
        properties = await propertyService.evaluateProperties({
          query: parsedQuery.query || '',
          date: parsedQuery.date || '',
          budget: parsedQuery.budget || { min: 200, max: 600 },
          adults: parsedQuery.adults || 2,
          children: parsedQuery.children || 0,
          number_of_rooms: parsedQuery.number_of_rooms || 1,
          preferences: parsedQuery.preferences || '',
        });
      }
      
      console.log('Properties from API:', properties);
      
      if (properties.length === 0) {
        setError('No properties found. Please try a different search.');
        setScreen('search');
        return;
      }
      
      setTopProperties(properties);
      setScreen('compare');
    } catch (error) {
      console.error('Search error:', error);
      setError(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setScreen('search');
    }
  };
  
  const handleStartNewCampaign = () => {
    setScreen('search');
    setTopProperties([]);
    setSelectedProperty(null);
  };
  
  const handleViewCampaign = (id: number) => {
    // Implement viewing a saved campaign
  };
  
  const handleWinnerSelected = (property: UnifiedProperty) => {
    setSelectedProperty(property);
    setScreen('booking');
  };
  
  return (
    <div className="min-h-screen bg-black text-white">
      {screen === 'home' && (
        <HomeScreen 
          onStartNewCampaign={handleStartNewCampaign} 
          onViewHistory={() => setScreen('history')}
        />
      )}
      
      {screen === 'search' && (
        <SearchScreen 
          onSearch={handleSearch} 
          error={error}
        />
      )}
      
      {screen === 'loading' && (
        <LoadingScreen />
      )}
      
      {screen === 'compare' && topProperties.length > 0 && (
        <ComparisonScreen 
          properties={topProperties}
          onWinnerSelected={handleWinnerSelected}
          onBack={() => setScreen('search')}
        />
      )}
      
      {screen === 'booking' && selectedProperty && (
        <BookingScreen 
          property={selectedProperty}
          onBack={() => setScreen('compare')}
        />
      )}
      
      {screen === 'history' && (
        <HistoryScreen 
          onBack={() => setScreen('home')}
          onViewCampaign={handleViewCampaign}
        />
      )}
    </div>
  );
}

export default App;