import React from 'react';
import { Search, History, ArrowRight } from 'lucide-react';

interface HomeScreenProps {
  onStartNewCampaign: () => void;
  onViewHistory: () => void;
}

function HomeScreen({ onStartNewCampaign, onViewHistory }: HomeScreenProps) {
  return (
    <div className="min-h-screen bg-black p-6 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-serif italic text-white">RentLuxe</h1>
          <p className="text-xl text-gray-400 font-light">Find your perfect temporary sanctuary</p>
        </div>

        <div className="w-full max-w-md space-y-4 mt-12">
          <button
            onClick={onStartNewCampaign}
            className="w-full flex items-center justify-between bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-2xl group hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            <div className="flex items-center gap-4">
              <Search size={24} />
              <div className="text-left">
                <div className="text-lg font-semibold">Start New Search</div>
                <div className="text-sm text-white/80">Find your next home</div>
              </div>
            </div>
            <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={onViewHistory}
            className="w-full flex items-center justify-between bg-white/5 backdrop-blur-sm text-white p-6 rounded-2xl group hover:bg-white/10 transition-all"
          >
            <div className="flex items-center gap-4">
              <History size={24} />
              <div className="text-left">
                <div className="text-lg font-semibold">Previous Searches</div>
                <div className="text-sm text-white/80">Review your saved properties</div>
              </div>
            </div>
            <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default HomeScreen