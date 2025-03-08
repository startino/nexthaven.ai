import React from 'react';
import { Search, History, ArrowRight } from 'lucide-react';

interface HomeScreenProps {
  onStartNewCampaign: () => void;
  onViewHistory: () => void;
}

function HomeScreen({ onStartNewCampaign, onViewHistory }: HomeScreenProps) {
  return (
    <div className="min-h-screen bg-black px-4 py-6 sm:p-6 flex flex-col">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-serif text-white">nexthaven.ai</h2>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-center space-y-4 mb-8 sm:mb-12 px-2">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-white leading-tight">
            Find your next short-term<br className="" /> <span className="text-pink-400">hotel</span> / <span className="text-purple-400">apartment</span> / <span className="text-indigo-400">hostel</span>.
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-400 font-light max-w-3xl mx-auto">
            Hours of accommodation searching, condensed into seconds.
          </p>
        </div>
        
        <div className="w-full max-w-xl px-2">
          <button
            onClick={onStartNewCampaign}
            className="w-full flex items-center justify-between bg-gradient-to-r from-purple-700 to-pink-700 text-white p-5 sm:p-6 rounded-xl sm:rounded-2xl group hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <Search size={22} className="sm:w-6 sm:h-6 flex-shrink-0" />
              <div className="text-left">
                <div className="text-lg sm:text-xl font-semibold">Start New Search</div>
                <div className="text-sm text-white/80 max-w-md">
                  With a simple description in your own words, our AI scans major platforms to deliver the top 5 personalized options.
                </div>
              </div>
            </div>
            <ArrowRight className="w-6 h-6 sm:w-7 sm:h-7 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
          </button>
          <div className="flex flex-col items-center mt-8">
            <p className="text-xs sm:text-sm">Interested in partnering with us? (Affiliate, Partner, etc.)</p>
            <p className="text-xs sm:text-sm mt-1">Contact: <a href="mailto:jorge.lewis@starti.no" className="text-purple-400 hover:text-purple-300">jorge.lewis@starti.no</a></p>
          </div>

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
      
      <div className="mt-10 sm:mt-12 text-center text-gray-400">

        <p className="text-xs sm:text-sm mt-4">Made by the <a href="https://starti.no" className="text-purple-400 hover:text-purple-300 underline" target="_blank" rel="noopener noreferrer">Startino Team</a></p>

      </div>
    </div>
  );
}

export default HomeScreen;