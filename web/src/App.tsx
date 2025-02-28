import React, { useState } from 'react';
import SearchScreen from './components/SearchScreen';
import SwipeScreen from './components/SwipeScreen';
import ComparisonScreen from './components/ComparisonScreen';
import HomeScreen from './components/HomeScreen';
import HistoryScreen from './components/HistoryScreen';
import LoadingScreen from './components/LoadingScreen';
import BookingScreen from './components/BookingScreen';

// Mock data for demonstration
const MOCK_PROPERTIES = [
  {
    id: 1,
    summary_image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=1080',
    images: {
      living: [
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=1080',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=1080'
      ],
      bedroom: [
        'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&q=80&w=1080',
        'https://images.unsplash.com/photo-1505693314120-0d443867891c?auto=format&fit=crop&q=80&w=1080'
      ],
      bathroom: [
        'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&q=80&w=1080'
      ],
      kitchen: [
        'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&q=80&w=1080'
      ]
    },
    price: '$2,500/month',
    location: 'Downtown Area',
    beds: 2,
    baths: 2,
    sqft: 1200,
    description: 'Modern apartment in the heart of downtown. Recently renovated with high-end appliances and hardwood floors throughout. Floor-to-ceiling windows offer stunning city views.',
    amenities: ['In-unit Laundry', 'Central AC', 'Dishwasher', 'Gym', 'Parking']
  },
  {
    id: 2,
    summary_image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=1080',
    images: {
      living: [
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=1080',
        'https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&q=80&w=1080'
      ],
      bedroom: [
        'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&q=80&w=1080',
        'https://images.unsplash.com/photo-1501125387900-6d7c0b1a6c91?auto=format&fit=crop&q=80&w=1080'
      ],
      bathroom: [
        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=1080'
      ],
      kitchen: [
        'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?auto=format&fit=crop&q=80&w=1080'
      ]
    },
    price: '$3,200/month',
    location: 'Riverside',
    beds: 3,
    baths: 2,
    sqft: 1500,
    description: 'Spacious riverside apartment with panoramic water views. Open concept living area, modern kitchen, and large balcony perfect for entertaining.',
    amenities: ['Pool', 'Balcony', 'Pet Friendly', 'Security', 'Storage']
  },
  {
    id: 3,
    summary_image: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&q=80&w=1080',
    images: {
      living: [
        'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&q=80&w=1080',
        'https://images.unsplash.com/photo-1523755231516-e43fd2e8dca5?auto=format&fit=crop&q=80&w=1080'
      ],
      bedroom: [
        'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=1080',
        'https://images.unsplash.com/photo-1588046130717-0eb0c9a3ba15?auto=format&fit=crop&q=80&w=1080'
      ],
      bathroom: [
        'https://images.unsplash.com/photo-1584622781867-1c5eb72c4f28?auto=format&fit=crop&q=80&w=1080'
      ],
      kitchen: [
        'https://images.unsplash.com/photo-1556912173-3bb406ef7e77?auto=format&fit=crop&q=80&w=1080'
      ]
    },
    price: '$4,100/month',
    location: 'Financial District',
    beds: 2,
    baths: 2,
    sqft: 1350,
    description: 'Luxury high-rise apartment with stunning city views. Designer finishes, smart home features, and 24/7 concierge service.',
    amenities: ['Concierge', 'Gym', 'Rooftop Lounge', 'Pet Spa', 'Wine Cellar']
  },
  {
    id: 4,
    summary_image: 'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&q=80&w=1080',
    images: {
      living: [
        'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&q=80&w=1080',
        'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&q=80&w=1080'
      ],
      bedroom: [
        'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&q=80&w=1080',
        'https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?auto=format&fit=crop&q=80&w=1080'
      ],
      bathroom: [
        'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&q=80&w=1080'
      ],
      kitchen: [
        'https://images.unsplash.com/photo-1617104551722-3b2d51366400?auto=format&fit=crop&q=80&w=1080'
      ]
    },
    price: '$5,500/month',
    location: 'Historic District',
    beds: 3,
    baths: 3,
    sqft: 2200,
    description: 'Restored historic brownstone with modern amenities. Original architectural details, custom millwork, and designer furnishings throughout.',
    amenities: ['Private Garden', 'Wine Room', 'Smart Home', 'Fireplace', 'Library']
  },
  {
    id: 5,
    summary_image: 'https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?auto=format&fit=crop&q=80&w=1080',
    images: {
      living: [
        'https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?auto=format&fit=crop&q=80&w=1080',
        'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&q=80&w=1080'
      ],
      bedroom: [
        'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=1080',
        'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&q=80&w=1080'
      ],
      bathroom: [
        'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&q=80&w=1080'
      ],
      kitchen: [
        'https://images.unsplash.com/photo-1600607687644-c7171b42498b?auto=format&fit=crop&q=80&w=1080'
      ]
    },
    price: '$3,800/month',
    location: 'Arts District',
    beds: 2,
    baths: 2,
    sqft: 1600,
    description: 'Contemporary loft in converted industrial building. Soaring ceilings, exposed brick, and artist studio space. Walking distance to galleries and cafes.',
    amenities: ['Artist Studio', 'Industrial Kitchen', 'Gallery Space', 'Loading Dock', 'Freight Elevator']
  },
  {
    id: 6,
    summary_image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&q=80&w=1080',
    images: {
      living: [
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&q=80&w=1080',
        'https://images.unsplash.com/photo-1600607687644-c7171b42498b?auto=format&fit=crop&q=80&w=1080'
      ],
      bedroom: [
        'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&q=80&w=1080',
        'https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?auto=format&fit=crop&q=80&w=1080'
      ],
      bathroom: [
        'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&q=80&w=1080'
      ],
      kitchen: [
        'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&q=80&w=1080'
      ]
    },
    price: '$4,800/month',
    location: 'Waterfront',
    beds: 3,
    baths: 2.5,
    sqft: 1800,
    description: 'Waterfront penthouse with wrap-around terrace. Floor-to-ceiling windows, chef\'s kitchen, and private boat slip. Unobstructed harbor views.',
    amenities: ['Boat Slip', 'Private Terrace', 'Wine Fridge', 'Smart Home', 'Valet Parking']
  },
  {
    id: 7,
    summary_image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&q=80&w=1080',
    images: {
      living: [
        'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&q=80&w=1080',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&q=80&w=1080'
      ],
      bedroom: [
        'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&q=80&w=1080',
        'https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?auto=format&fit=crop&q=80&w=1080'
      ],
      bathroom: [
        'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&q=80&w=1080'
      ],
      kitchen: [
        'https://images.unsplash.com/photo-1600607687644-c7171b42498b?auto=format&fit=crop&q=80&w=1080'
      ]
    },
    price: '$6,200/month',
    location: 'Garden District',
    beds: 4,
    baths: 3.5,
    sqft: 2800,
    description: 'Elegant mansion with private gardens. Restored Victorian details, modern luxury amenities, and separate carriage house. Perfect for entertaining.',
    amenities: ['Private Garden', 'Carriage House', 'Butler\'s Pantry', 'Conservatory', 'Staff Quarters']
  },
  {
    id: 8,
    summary_image: 'https://images.unsplash.com/photo-1600607687644-c7171b42498b?auto=format&fit=crop&q=80&w=1080',
    images: {
      living: [
        'https://images.unsplash.com/photo-1600607687644-c7171b42498b?auto=format&fit=crop&q=80&w=1080',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&q=80&w=1080'
      ],
      bedroom: [
        'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&q=80&w=1080',
        'https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?auto=format&fit=crop&q=80&w=1080'
      ],
      bathroom: [
        'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&q=80&w=1080'
      ],
      kitchen: [
        'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&q=80&w=1080'
      ]
    },
    price: '$3,900/month',
    location: 'Tech Hub',
    beds: 2,
    baths: 2,
    sqft: 1400,
    description: 'Smart home with cutting-edge technology. Voice-controlled everything, automated systems, and dedicated home office with gigabit internet.',
    amenities: ['Smart Home', 'Home Office', 'Gigabit Internet', 'EV Charging', 'Package Room']
  },
  {
    id: 9,
    summary_image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&q=80&w=1080',
    images: {
      living: [
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&q=80&w=1080',
        'https://images.unsplash.com/photo-1600607687644-c7171b42498b?auto=format&fit=crop&q=80&w=1080'
      ],
      bedroom: [
        'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&q=80&w=1080',
        'https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?auto=format&fit=crop&q=80&w=1080'
      ],
      bathroom: [
        'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&q=80&w=1080'
      ],
      kitchen: [
        'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&q=80&w=1080'
      ]
    },
    price: '$4,500/month',
    location: 'Cultural District',
    beds: 3,
    baths: 2,
    sqft: 1700,
    description: 'Sophisticated apartment in cultural hub. Designer furnishings, art collection, and music room. Steps from museums and concert halls.',
    amenities: ['Music Room', 'Art Gallery', 'Library', 'Practice Room', 'Recording Studio']
  },
  {
    id: 10,
    summary_image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&q=80&w=1080',
    images: {
      living: [
        'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&q=80&w=1080',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&q=80&w=1080'
      ],
      bedroom: [
        'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&q=80&w=1080',
        'https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?auto=format&fit=crop&q=80&w=1080'
      ],
      bathroom: [
        'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&q=80&w=1080'
      ],
      kitchen: [
        'https://images.unsplash.com/photo-1600607687644-c7171b42498b?auto=format&fit=crop&q=80&w=1080'
      ]
    },
    price: '$5,800/month',
    location: 'Eco District',
    beds: 3,
    baths: 2,
    sqft: 1900,
    description: 'Sustainable living at its finest. Solar-powered, green roof, and recycled materials throughout. LEED Platinum certified building.',
    amenities: ['Solar Panels', 'Green Roof', 'Composting', 'Rainwater Harvesting', 'Bike Storage']
  }
];

type Screen = 'home' | 'search' | 'loading' | 'compare' | 'history' | 'booking';

function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<typeof MOCK_PROPERTIES[0] | null>(null);
  const [topProperties, setTopProperties] = useState<typeof MOCK_PROPERTIES>([]);
  
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setScreen('loading');
    
    // Simulate AI processing and return top 5 matches
    setTimeout(() => {
      // In production, this would be an API call to the AI backend
      const parsedQuery = JSON.parse(query);
      const filtered = MOCK_PROPERTIES
        .slice(0, 5) // Just take first 5 for demo
        .sort(() => Math.random() - 0.5); // Randomize for demo
      setTopProperties(filtered);
      setScreen('compare');
    }, 1500);
  };

  const handleStartNewCampaign = () => {
    setTopProperties([]);
    setScreen('search');
  };

  const handleViewCampaign = (id: number) => {
    setScreen('compare');
  };

  const handleWinnerSelected = (property: typeof MOCK_PROPERTIES[0]) => {
    setSelectedProperty(property);
    setTimeout(() => {
      setScreen('booking');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {screen === 'home' && (
        <HomeScreen
          onStartNewCampaign={handleStartNewCampaign}
          onViewHistory={() => setScreen('history')}
        />
      )}
      
      {screen === 'search' && (
        <SearchScreen onSearch={handleSearch} />
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