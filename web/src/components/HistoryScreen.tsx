import React from 'react';
import { ArrowLeft, Calendar, MapPin } from 'lucide-react';

interface Campaign {
  id: number;
  date: string;
  location: string;
  properties: Array<{
    id: number;
    image: string;
    price: string;
    location: string;
  }>;
}

interface HistoryScreenProps {
  onBack: () => void;
  onViewCampaign: (id: number) => void;
}

// Mock data for demonstration
const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: 1,
    date: '2025-03-15',
    location: 'Downtown Seattle',
    properties: [
      {
        id: 1,
        image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=1080',
        price: '$2,500/month',
        location: 'Downtown Area'
      },
      {
        id: 2,
        image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=1080',
        price: '$3,200/month',
        location: 'Riverside'
      }
    ]
  },
  {
    id: 2,
    date: '2025-03-10',
    location: 'Capitol Hill',
    properties: [
      {
        id: 3,
        image: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&q=80&w=1080',
        price: '$2,800/month',
        location: 'Capitol Hill'
      }
    ]
  }
];

function HistoryScreen({ onBack, onViewCampaign }: HistoryScreenProps) {
  return (
    <div className="min-h-screen bg-black">
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm">
        <div className="flex items-center gap-4 p-4">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="text-white" size={24} />
          </button>
          <h1 className="text-2xl font-serif italic text-white">Previous Searches</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {MOCK_CAMPAIGNS.map((campaign) => (
          <div
            key={campaign.id}
            onClick={() => onViewCampaign(campaign.id)}
            className="bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden cursor-pointer hover:bg-white/10 transition-all"
          >
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between text-white/80">
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  <span>{campaign.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={16} />
                  <span>{campaign.location}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {campaign.properties.map((property) => (
                  <div key={property.id} className="relative aspect-video rounded-lg overflow-hidden">
                    <img
                      src={property.image}
                      alt={property.location}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <div className="text-sm font-semibold text-white">{property.price}</div>
                      <div className="text-xs text-white/80">{property.location}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HistoryScreen;