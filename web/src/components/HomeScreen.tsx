import React from 'react';
import { Search, History, ArrowRight } from 'lucide-react';

interface HomeScreenProps {
  onStartNewCampaign: () => void;
  onViewHistory: () => void;
}

function HomeScreen({ onStartNewCampaign, onViewHistory }: HomeScreenProps) {
  return (
    <div className="min-h-screen bg-black p-6 flex flex-col">
              <div className="text-center space-y-4 mt-12">
          <h2 className="text-2xl font-serif text-white">nexthaven.ai</h2>
        </div>
      <div className="flex-1 flex flex-col items-center justify-center space-y-8">

        <div className="text-center space-y-4">
          <h1 className="text-5xl font-serif text-white">Find your next short-term hotel / apartment / hostel.</h1>
          <p className="text-xl text-gray-400 font-light max-w-3xl mx-auto">Hours of accommodation searching, condensed into seconds. </p>
        </div>
        <div className="w-full max-w-xl space-y-4 mt-12">
          <button
            onClick={onStartNewCampaign}
            className="w-full flex items-center justify-between bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-2xl group hover:from-purple-700 hover:to-pink-700 transition-all"
          >
            <div className="flex items-center gap-4">
              <Search size={24} />
              <div className="text-left">
                <div className="text-lg font-semibold">Start New Search</div>
                <div className="text-sm text-white/80 max-w-md"> With a simple description in your own words, our AI scans major platforms to deliver just 5 stellar options, no scrolling required.
                </div>
              </div>
            </div>
            <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </button>

          {/* <button
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
          </button> */}
        </div>
      </div>
      <div className="mt-8 text-center text-gray-400">
        <p className="text-sm">Made by the <a href="https://starti.no" className="text-purple-400 hover:text-purple-300 underline" target="_blank" rel="noopener noreferrer">Startino Team</a></p>
        <p className="text-sm mt-1">Contact: <a href="mailto:jorge.lewis@starti.no" className="text-purple-400 hover:text-purple-300">jorge.lewis@starti.no</a></p>
      </div>
    </div>
  );
}

export default HomeScreen