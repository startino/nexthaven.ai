import React from "react";
import { Search, ArrowRight, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface HomeScreenProps {
  onStartNewCampaign: () => void;
  onNavigateToAuth: () => void;
}

function HomeScreen({ onStartNewCampaign, onNavigateToAuth }: HomeScreenProps) {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-black px-4 py-6 sm:p-6 flex flex-col">
      {!user && !loading && (
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl font-serif font-bold tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 drop-shadow-sm">
              NextHaven.ai
            </span>
          </h2>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-center space-y-4 mb-8 sm:mb-12 px-2">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-white leading-tight">
            Find your next
            <br className="" /> <span className="text-pink-400">hotel</span> /{" "}
            <span className="text-purple-400">apartment</span> /{" "}
            <span className="text-indigo-400">hostel</span>.
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-400 font-light max-w-3xl mx-auto">
            Hours of accommodation searching, condensed into seconds.
          </p>
        </div>

        <div className="w-full max-w-xl px-2">
          {loading ? (
            // Loading state
            <div className="w-full flex items-center justify-center bg-gradient-to-r from-purple-700/50 to-pink-700/50 text-white p-5 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg">
              <div className="animate-pulse flex flex-col items-center">
                <div className="h-6 w-6 rounded-full bg-purple-500 mb-3"></div>
                <div className="h-4 w-24 bg-white/30 rounded"></div>
              </div>
            </div>
          ) : user ? (
            // Authenticated user - show search button
            <button
              onClick={onStartNewCampaign}
              id="btn-start-new-search"
              className="w-full flex items-center justify-between bg-gradient-to-r from-purple-700 to-pink-700 text-white p-5 sm:p-6 rounded-xl sm:rounded-2xl group hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <Search size={22} className="sm:w-6 sm:h-6 flex-shrink-0" />
                <div className="text-left">
                  <div className="text-lg sm:text-xl font-semibold">
                    Start New Search
                  </div>
                </div>
              </div>
              <ArrowRight className="w-6 h-6 sm:w-7 sm:h-7 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
            </button>
          ) : (
            // Unauthenticated user - show only the larger sign-in button
            <button
              onClick={onNavigateToAuth}
              className="w-full flex items-center justify-between bg-gradient-to-r from-purple-700 to-pink-700 text-white p-5 sm:p-6 rounded-xl sm:rounded-2xl group hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <LogIn size={22} className="sm:w-6 sm:h-6 flex-shrink-0" />
                <div className="text-left">
                  <div className="text-lg sm:text-xl font-semibold">
                    Sign In to Search
                  </div>
                  <div className="text-sm text-white/80">
                    Unlock personalized accommodation search
                  </div>
                </div>
              </div>
              <ArrowRight className="w-6 h-6 sm:w-7 sm:h-7 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
            </button>
          )}

          <div className="flex flex-col items-center mt-8 text-center">
            <p className="text-xs sm:text-sm">
              Interested in partnering with us?
            </p>
            <p className="text-xs sm:text-sm mt-1">
              Contact:{" "}
              <a
                href="mailto:jorge.lewis@starti.no"
                className="text-purple-400 hover:text-purple-300"
              >
                jorge.lewis@starti.no
              </a>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-10 sm:mt-12 text-center text-gray-400">
        <p className="text-xs sm:text-sm mt-4">
          Made by the{" "}
          <a
            href="https://starti.no"
            className="text-purple-400 hover:text-purple-300 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Startino Team
          </a>
        </p>
      </div>
    </div>
  );
}

export default HomeScreen;
