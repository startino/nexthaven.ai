import React, { useState, useEffect } from 'react';
import { Search, Calendar, Users, DollarSign, MapPin, Sparkles, AlertCircle, ArrowLeft, ArrowRight, Clock, Plus, Bed, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchScreenProps {
  onSearch: (query: string) => void;
  onBack?: () => void;
  error?: string | null;
}

interface Budget {
  min: number;
  max: number;
}

// Remove property types as requested
// const PROPERTY_TYPES = [...] as const;
// type PropertyType = typeof PROPERTY_TYPES[number];

interface SearchForm {
  query: string;
  date: string;
  budget: Budget;
  adults: number;
  // children removed as requested (default to 0)
  number_of_rooms: number;
  // property_type removed as requested
  preferences: string;
}

// Function to get previous preferences from local storage
const getPreviousPreferences = () => {
  try {
    const storedPreferences = localStorage.getItem('previousPreferences');
    if (storedPreferences) {
      return JSON.parse(storedPreferences);
    }
  } catch (error) {
    console.error('Error retrieving preferences from local storage:', error);
  }
  
  // Default preferences if none found in local storage
  return [
    {
      id: 1,
      date: '2025-03-15',
      preferences: 'Modern apartment with a home office setup, high-speed internet, and a quiet neighborhood. Must have in-unit laundry and a balcony.',
    },
  ];
};

// Define default locations
const DEFAULT_LOCATIONS = [
  { name: 'Kuala Lumpur', country: 'Malaysia' },
  { name: 'Bali', country: 'Indonesia' },
  { name: 'Da Nang', country: 'Vietnam' }
];

// Define recommended time options - split into when and period
const WHEN_OPTIONS = [
  { label: 'Next Week', value: 'Next Week' },
  { label: 'Two Weeks', value: 'In Two Weeks' },
  { label: 'Next Month', value: 'Next Month' },
];

const PERIOD_OPTIONS = [
  { label: '1 Week', value: 'for 1 Week' },
  { label: '1 Month', value: 'for 1 Month' },
  { label: '3 Months', value: 'for 3 Months' },
];

// Template text for preferences
const PREFERENCE_TEMPLATE = `Type of property:
[apartment / hostel / co-living / etc.]

Ambience:
[modern / rustic / cozy / minimalist / traditional / bohemian / elegant]

Amenities:
[pool / gym / parking / etc.]

Location:
[15min walk to the beach / 10min drive to the city center / etc.]

Literally any other preferences:
[Any other specific requirements or preferences you have]`;

// Updated search steps
type SearchStep = 'location' | 'details' | 'preferences';

// Define the type for preferences
interface Preference {
  id: number;
  date: string;
  preferences: string;
}

function SearchScreen({ onSearch, onBack, error }: SearchScreenProps) {
  const [currentStep, setCurrentStep] = useState<SearchStep>('location');
  const [form, setForm] = useState<SearchForm>({
    query: '',
    date: '',
    budget: {
      min: 200,
      max: 600
    },
    adults: 2,
    // children removed
    number_of_rooms: 1,
    // property_type removed
    preferences: PREFERENCE_TEMPLATE,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [showPreviousPreferences, setShowPreviousPreferences] = useState(false);
  const [previousPreferences, setPreviousPreferences] = useState<Preference[]>(getPreviousPreferences());

  // Validate location step
  const validateLocationStep = () => {
    const requiredFields = [];
    if (!form.query) requiredFields.push('location');
    if (!form.date) requiredFields.push('dates');

    if (requiredFields.length > 0) {
      setAiMessage(`Please provide your ${requiredFields.join(', ')} to help me find the best matches for you.`);
      return false;
    }
    return true;
  };

  // Validate details step
  const validateDetailsStep = () => {
    const requiredFields = [];
    if (!form.budget.min || !form.budget.max) requiredFields.push('budget range');
    if (!form.number_of_rooms) requiredFields.push('number of rooms');

    if (requiredFields.length > 0) {
      setAiMessage(`Please provide your ${requiredFields.join(', ')} to help me find the best matches for you.`);
      return false;
    }
    return true;
  };

  // Handle location step submission
  const handleLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLocationStep()) return;
    setCurrentStep('details');
  };

  // Handle details step submission
  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateDetailsStep()) return;
    
    // If preferences is empty, reset to template
    if (!form.preferences.trim()) {
      setForm({ ...form, preferences: PREFERENCE_TEMPLATE });
    }
    
    setCurrentStep('preferences');
    setAiMessage('Finally, tell me more about your specific preferences for your ideal home.');
  };

  // Handle preferences step submission
  const handlePreferencesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    setAiMessage('Analyzing your preferences and finding perfect matches...');

    // Save preferences to local storage
    const newPreference = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      preferences: form.preferences
    };
    
    const updatedPreferences = [newPreference, ...previousPreferences.slice(0, 4)]; // Keep only the 5 most recent
    
    try {
      localStorage.setItem('previousPreferences', JSON.stringify(updatedPreferences));
    } catch (error) {
      console.error('Error saving preferences to local storage:', error);
    }

    const searchQuery = JSON.stringify({
      ...form,
      budget: {
        min: form.budget.min,
        max: form.budget.max
      },
      children: 0 // Default to 0 as requested
    });

    setTimeout(() => {
      onSearch(searchQuery);
    }, 1500);
  };

  const handleSelectPreviousPreference = (preference: string) => {
    setForm({ ...form, preferences: preference });
    setShowPreviousPreferences(false);
  };

  // Reset preferences to template
  const resetToTemplate = () => {
    setForm({ ...form, preferences: PREFERENCE_TEMPLATE });
  };

  // Format price to be pretty
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };

  // Location step (first step)
  const renderLocationStep = () => (
    <form onSubmit={handleLocationSubmit} className="space-y-6">
      {/* Location */}
      <motion.div 
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="rounded-xl sm:rounded-2xl bg-white/5 backdrop-blur-sm p-4 sm:p-5 ring-1 ring-white/10 space-y-3 sm:space-y-4"
      >
        <div className="flex items-center gap-3 text-white/80 mb-1 sm:mb-2">
          <MapPin size={20} />
          <span className="font-medium">Where would you like to stay?</span>
        </div>
        <input
          type="text"
          placeholder="e.g. Chiang Mai, Thailand"
          className="w-full bg-white/5 text-white placeholder-gray-500 rounded-lg p-3 sm:p-4 outline-none focus:ring-1 focus:ring-purple-500"
          value={form.query}
          onChange={(e) => setForm({ ...form, query: e.target.value })}
        />
        
        {/* Default Location Suggestions */}
        <div className="pt-2">
          <p className="text-sm text-white/60 mb-2">Popular destinations:</p>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_LOCATIONS.map((location) => (
              <button
                key={location.name}
                type="button"
                onClick={() => setForm({ ...form, query: `${location.name}, ${location.country}` })}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-sm text-white/80 transition-colors"
              >
                {location.name}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Dates */}
      <motion.div 
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="rounded-xl sm:rounded-2xl bg-white/5 backdrop-blur-sm p-4 sm:p-5 ring-1 ring-white/10 space-y-3 sm:space-y-4"
      >
        <div className="flex items-center gap-3 text-white/80 mb-1 sm:mb-2">
          <Calendar size={20} />
          <span className="font-medium">When?</span>
        </div>
        <p className="text-sm text-white/60">
          Use the buttons or type your own dates in the field below.
        </p>
        
        {/* Recommended Time Periods - Moved above the input field */}
        <div>
          <p className="text-sm text-white/60 mb-2">When:</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {WHEN_OPTIONS.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => {
                  // Extract any existing period part (after "for")
                  const currentPeriod = form.date.includes(" for ") 
                    ? form.date.split(" for ")[1] 
                    : "";
                  
                  // Combine the new "when" with any existing period
                  const newDate = currentPeriod 
                    ? `${option.value} for ${currentPeriod}` 
                    : option.value;
                  
                  setForm({ ...form, date: newDate });
                }}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  form.date.startsWith(option.value) 
                    ? 'bg-purple-500/30 text-white' 
                    : 'bg-white/10 hover:bg-white/20 text-white/80'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        
        <div>

          <p className="text-sm text-white/60 mb-2">Period:</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => {
                  // Extract any existing "when" part (before "for")
                  const currentWhen = form.date.split(" for ")[0].trim();
                  
                  // Only use the currentWhen if it's not empty and not just the period
                  const whenPart = currentWhen && !PERIOD_OPTIONS.some(p => p.value === `for ${currentWhen}`) 
                    ? currentWhen 
                    : "";
                  
                  // Combine any existing "when" with the new period
                  const newDate = whenPart 
                    ? `${whenPart} ${option.value}` 
                    : option.value.startsWith("for ") ? option.value.substring(4) : option.value;
                  
                  setForm({ ...form, date: newDate });
                }}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  form.date.includes(option.value) 
                    ? 'bg-purple-500/30 text-white' 
                    : 'bg-white/10 hover:bg-white/20 text-white/80'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        
        <input
          type="text"
          placeholder="e.g. March 15 - April 15"
          className="w-full bg-white/5 text-white placeholder-gray-500 rounded-lg p-3 sm:p-4 outline-none focus:ring-1 focus:ring-purple-500"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
        

      </motion.div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        type="submit"
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium py-4 px-6 rounded-xl sm:rounded-full transition-all hover:from-purple-600 hover:to-pink-600 shadow-lg"
      >
        Continue to Details
        <ArrowRight size={20} />
      </motion.button>
    </form>
  );

  // Details step (second step)
  const renderDetailsStep = () => (
    <form onSubmit={handleDetailsSubmit} className="space-y-6">
      {/* Budget Range - Single input with calculated minimum */}
      <motion.div 
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="rounded-xl sm:rounded-2xl bg-white/5 backdrop-blur-sm p-4 sm:p-5 ring-1 ring-white/10 space-y-4"
      >
        <div className="flex items-center gap-3 text-white/80 mb-1 sm:mb-2">
          <DollarSign size={20} />
          <span className="font-medium">Total Budget for Stay</span>
        </div>
        <div className="pt-2">
          {/* Single budget input field */}
          <div className="relative">
            <span className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-white/60">$</span>
            <input
              type="number"
              min="100"
              step="50"
              value={form.budget.max}
              onChange={(e) => {
                const newMax = parseInt(e.target.value) || 0;
                // Calculate minimum as 70% of maximum (can be adjusted)
                const calculatedMin = Math.floor(newMax * 0.7);
                setForm({ 
                  ...form, 
                  budget: { 
                    min: calculatedMin,
                    max: newMax
                  } 
                });
              }}
              className="w-full bg-white/5 text-white rounded-lg p-3 sm:p-4 pl-8 sm:pl-10 outline-none focus:ring-1 focus:ring-purple-500"
              placeholder="Enter your maximum budget"
            />
          </div>
        </div>
      </motion.div>

      {/* Number of Rooms - Multiple choice */}
      <motion.div 
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="rounded-xl sm:rounded-2xl bg-white/5 backdrop-blur-sm p-4 sm:p-5 ring-1 ring-white/10 space-y-4"
      >
        <div className="flex items-center gap-3 text-white/80 mb-1 sm:mb-2">
          <Bed size={20} />
          <span className="font-medium">Number of Rooms</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => setForm({ 
                ...form, 
                number_of_rooms: num,
              })}
              className={`py-3 sm:py-4 rounded-lg flex items-center justify-center transition-colors ${
                form.number_of_rooms === num
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              {num} {num === 1 ? 'Room' : 'Rooms'}
            </button>
          ))}
        </div>
      </motion.div>

      <div className="flex gap-3 sm:gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => setCurrentStep('location')}
          className="flex-1 flex items-center justify-center gap-2 bg-white/10 text-white font-medium py-4 px-4 sm:px-6 rounded-xl sm:rounded-full transition-all hover:bg-white/20"
        >
          <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
          <span className="text-sm sm:text-base">Back</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium py-4 px-4 sm:px-6 rounded-xl sm:rounded-full transition-all hover:from-purple-600 hover:to-pink-600 shadow-lg"
        >
          <span className="text-sm sm:text-base">Continue</span>
          <ArrowRight size={18} className="sm:w-5 sm:h-5" />
        </motion.button>
      </div>
    </form>
  );

  // Preferences step (third step)
  const renderPreferencesStep = () => (
    <form onSubmit={handlePreferencesSubmit} className="space-y-6">
      <motion.div 
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="rounded-2xl bg-white/5 backdrop-blur-sm p-5 ring-1 ring-white/10 space-y-4"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3 text-white/80">
            <Sparkles size={20} />
            <span className="font-medium">Your Preferences</span>
          </div>
          <button
            type="button"
            onClick={() => setShowPreviousPreferences(!showPreviousPreferences)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/80 hover:bg-white/20 transition-colors"
          >
            <Clock size={16} />
            <span>Previous Preferences</span>
          </button>
        </div>

        <AnimatePresence>
          {showPreviousPreferences && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 mb-4"
            >
              {previousPreferences.map((prev: Preference) => (
                <motion.button
                  key={prev.id}
                  type="button"
                  onClick={() => handleSelectPreviousPreference(prev.preferences)}
                  className="w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left group"
                >
                  <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                    <Clock size={14} />
                    <span>{prev.date}</span>
                  </div>
                  <p className="text-white/90 line-clamp-2 group-hover:text-white transition-colors">
                    {prev.preferences}
                  </p>
                </motion.button>
              ))}
              <motion.button
                type="button"
                onClick={() => setShowPreviousPreferences(false)}
                className="w-full p-4 rounded-xl border-2 border-dashed border-white/10 hover:border-white/20 transition-colors flex items-center justify-center gap-2 text-white/60 hover:text-white/80"
              >
                <Plus size={20} />
                <span>Write New Preferences</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <textarea
          className="w-full bg-white/5 text-white placeholder-gray-500 rounded-xl p-4 outline-none resize-none font-medium"
          placeholder="Tell me more about your ideal home. What makes a place feel special to you? Any specific features or qualities you're looking for?"
          rows={12}
          value={form.preferences}
          onChange={(e) => setForm({ ...form, preferences: e.target.value })}
          onBlur={(e) => {
            // If the textarea is empty or just whitespace, reset to template
            if (!e.target.value.trim()) {
              resetToTemplate();
            }
          }}
          style={{ lineHeight: '1.6' }}
        />
        <div className="flex justify-between items-center">
          <p className="text-xs text-white/50 italic">
            Fill out the template above with your preferences or write your own description.
          </p>
          <button
            type="button"
            onClick={resetToTemplate}
            className="text-xs text-pink-400 hover:text-pink-300 transition-colors"
          >
            Reset to Template
          </button>
        </div>
      </motion.div>

      <div className="flex gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => setCurrentStep('details')}
          className="flex-1 flex items-center justify-center gap-2 bg-white/10 text-white font-medium py-4 px-6 rounded-full transition-all hover:bg-white/20"
        >
          <ArrowLeft size={20} />
          Back
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium py-4 px-6 rounded-full transition-all hover:from-purple-600 hover:to-pink-600"
          disabled={isLoading}
        >
          <Search size={20} />
          {isLoading ? "Finding Perfect Matches..." : "Discover Properties"}
        </motion.button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8 text-center md:text-left">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-white/80 hover:text-white mb-4"
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
          )}
          <h1 className="text-2xl sm:text-3xl font-serif text-white">Find your perfect stay</h1>
          <p className="text-gray-400 mt-2">Tell us what you're looking for</p>
        </div>

        {/* AI Message */}
        {aiMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 sm:p-5 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm"
          >
            <div className="flex gap-3">
              <Sparkles className="text-purple-400 w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 mt-0.5" />
              <p className="text-white/90 text-sm sm:text-base">{aiMessage}</p>
            </div>
          </motion.div>
        )}

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 sm:p-5 rounded-xl bg-red-500/20 backdrop-blur-sm"
          >
            <div className="flex gap-3">
              <AlertCircle className="text-red-400 w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 mt-0.5" />
              <p className="text-white/90 text-sm sm:text-base">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Search Steps */}
        <div className="space-y-6">
          {currentStep === 'location' && renderLocationStep()}
          {currentStep === 'details' && renderDetailsStep()}
          {currentStep === 'preferences' && renderPreferencesStep()}
        </div>
      </div>
    </div>
  );
}

export default SearchScreen;