import React, { useState } from 'react';
import SearchScreen from './components/SearchScreen';
import SwipeScreen from './components/SwipeScreen';
import ComparisonScreen from './components/ComparisonScreen';
import HomeScreen from './components/HomeScreen';
import HistoryScreen from './components/HistoryScreen';
import LoadingScreen from './components/LoadingScreen';
import BookingScreen from './components/BookingScreen';
import { propertyService, PropertyResult } from './services/api';
type Screen = 'home' | 'search' | 'loading' | 'compare' | 'history' | 'booking';

const transformResponse = (property: PropertyResult): PropertyResult => {
  return {
    id: property.id,
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

function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<PropertyResult | null>(null);
  const [topProperties, setTopProperties] = useState<PropertyResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setScreen('loading');
    setTopProperties([]); // Clear previous results
    setError(null); // Clear any previous errors
    
    try {
      console.log('Received search query:', query);
      const parsedQuery = JSON.parse(query);
      console.log('Parsed query:', parsedQuery);
      
      await propertyService.evaluateProperties(
        {
          query: parsedQuery.query || '',
          date: parsedQuery.date || '',
          budget: parsedQuery.budget || { min: 0, max: 10000 },
          adults: parsedQuery.adults || 2,
          children: parsedQuery.children || 0,
          number_of_rooms: parsedQuery.number_of_rooms || 1,
          property_type: parsedQuery.property_type || 'Hotels',
          preferences: parsedQuery.preferences || '',
          max_results: 5
        },
        (property) => {
          console.log('Received property:', property);
          setTopProperties(prev => [...prev, transformResponse(property)]);
        }
      );
      
      setScreen('compare');
    } catch (error) {
      console.error('Error during property evaluation:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      setScreen('search');
    }
  };

  const handleStartNewCampaign = () => {
    setTopProperties([]);
    setError(null);
    setScreen('search');
  };

  const handleViewCampaign = (id: number) => {
    setScreen('compare');
  };

  const handleWinnerSelected = (property: any) => {
    setSelectedProperty(property);
    setTimeout(() => {
      setScreen('booking');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {error && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-4 text-center">
          {error}
        </div>
      )}
      
      {screen === 'home' && (
        <HomeScreen
          onStartNewCampaign={handleStartNewCampaign}
          onViewHistory={() => setScreen('history')}
        />
      )}
      
      {screen === 'search' && (
        <SearchScreen onSearch={handleSearch} error={error} />
      )}

      {screen === 'loading' && (
        <LoadingScreen />
      )}
      
      {screen === 'compare' && (
        <ComparisonScreen
          properties={topProperties}
          onWinnerSelected={handleWinnerSelected}
          onBack={() => setScreen('search')}
        />
      )}

      {screen === 'history' && (
        <HistoryScreen
          onBack={() => setScreen('home')}
          onViewCampaign={handleViewCampaign}
        />
      )}

      {screen === 'booking' && selectedProperty && (
        <BookingScreen
          property={selectedProperty}
          onBack={() => setScreen('compare')}
        />
      )}
    </div>
  );
}

export default App;