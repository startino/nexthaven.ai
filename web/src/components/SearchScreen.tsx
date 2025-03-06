import React, { useState, useEffect } from 'react';
import { Search, Calendar, Users, DollarSign, MapPin, Sparkles, AlertCircle, ArrowLeft, ArrowRight, Clock, Plus, Bed, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Range, getTrackBackground } from 'react-range';

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
    {
      id: 2,
      date: '2025-03-10',
      preferences: 'Luxury condo in a walkable area, close to restaurants. Looking for high-end finishes, concierge service, and a fitness center.',
    }
  ];
};

// Template text for preferences
const PREFERENCE_TEMPLATE = `
Ambience:
[Type out the vibe of the place you're looking for; modern / rustic / etc.]

Amenities:
[Type out the amenities you're looking for; pool / gym / etc.]

Location:
[Type out the location you're looking for, such as nearby public transportation, close to a beach, etc.]

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
      min: 500,
      max: 2000
    },
    adults: 1,
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
    if (!form.adults) requiredFields.push('guests');

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
    setAiMessage('Now, let me know about your budget and room requirements.');
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
        className="rounded-2xl bg-white/5 backdrop-blur-sm p-5 ring-1 ring-white/10 space-y-4"
      >
        <div className="flex items-center gap-3 text-white/80 mb-2">
          <MapPin size={20} />
          <span className="font-medium">Where would you like to stay?</span>
        </div>
        <input
          type="text"
          placeholder="City, neighborhood, or specific address"
          className="w-full bg-white/5 text-white placeholder-gray-500 rounded-xl p-3 outline-none"
          value={form.query}
          onChange={(e) => setForm({ ...form, query: e.target.value })}
        />
      </motion.div>

      {/* Dates */}
      <motion.div 
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="rounded-2xl bg-white/5 backdrop-blur-sm p-5 ring-1 ring-white/10"
      >
        <div className="flex items-center gap-3 text-white/80 mb-2">
          <Calendar size={20} />
          <span className="font-medium">When?</span>
        </div>
        <input
          type="text"
          placeholder="e.g., March 15 - April 15"
          className="w-full bg-white/5 text-white placeholder-gray-500 rounded-xl p-3 outline-none"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
      </motion.div>

      {/* Guests - Adults only */}
      <motion.div 
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="rounded-2xl bg-white/5 backdrop-blur-sm p-5 ring-1 ring-white/10"
      >
        <div className="flex items-center gap-3 text-white/80 mb-4">
          <Users size={20} />
          <span className="font-medium">Guests</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {[1, 2, 3, 4, 5, '6+'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => setForm({ ...form, adults: typeof num === 'number' ? num : 6 })}
              className={`flex-1 min-w-[80px] py-3 px-4 rounded-xl flex items-center justify-center transition-colors ${
                (typeof num === 'number' && form.adults === num) || 
                (num === '6+' && form.adults >= 6)
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              {num} {num === 1 ? 'Guest' : 'Guests'}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        type="submit"
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium py-4 px-6 rounded-full transition-all hover:from-purple-600 hover:to-pink-600"
      >
        <ArrowRight size={20} />
        Continue to Details
      </motion.button>
    </form>
  );

  // Details step (second step)
  const renderDetailsStep = () => (
    <form onSubmit={handleDetailsSubmit} className="space-y-6">
      {/* Budget Range - Double ended slider using react-range */}
      <motion.div 
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="rounded-2xl bg-white/5 backdrop-blur-sm p-5 ring-1 ring-white/10"
      >
        <div className="flex items-center gap-3 text-white/80 mb-2">
          <DollarSign size={20} />
          <span className="font-medium">Total Budget for Stay</span>
        </div>
        <div className="space-y-6 pt-4">
          <div className="flex justify-between text-white/60 text-sm">
            <span>{formatPrice(form.budget.min)}</span>
            <span>{formatPrice(form.budget.max)}</span>
          </div>
          
          {/* React Range slider */}
          <div className="py-8">
            <Range
              step={100}
              min={0}
              max={5000}
              values={[form.budget.min, form.budget.max]}
              onChange={(values) => {
                // Ensure minimum gap of 100
                if (values[1] - values[0] >= 100) {
                  setForm({
                    ...form,
                    budget: {
                      min: values[0],
                      max: values[1]
                    }
                  });
                }
              }}
              renderTrack={({ props, children }) => (
                <div
                  onMouseDown={props.onMouseDown}
                  onTouchStart={props.onTouchStart}
                  style={{
                    ...props.style,
                    height: '36px',
                    display: 'flex',
                    width: '100%'
                  }}
                >
                  <div
                    ref={props.ref}
                    className="w-full h-3 rounded-full self-center"
                    style={{
                      background: getTrackBackground({
                        values: [form.budget.min, form.budget.max],
                        colors: ['rgba(255, 255, 255, 0.2)', 'rgba(236, 72, 153, 0.8)', 'rgba(255, 255, 255, 0.2)'],
                        min: 0,
                        max: 5000
                      }),
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)'
                    }}
                  >
                    {children}
                  </div>
                </div>
              )}
              renderThumb={({ props, index, isDragged }) => (
                <div
                  {...props}
                  className="focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
                  style={{
                    ...props.style,
                    height: 24,
                    width: 24,
                    borderRadius: '50%',
                    backgroundColor: isDragged ? '#ec4899' : '#a855f7',
                    background: 'linear-gradient(to right, #a855f7, #ec4899)',
                    border: '2px solid white',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                  }}
                >
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs font-medium text-white whitespace-nowrap bg-gray-800/70 px-2 py-1 rounded-md">
                    {formatPrice(index === 0 ? form.budget.min : form.budget.max)}
                  </div>
                </div>
              )}
            />
          </div>
          
          {/* Budget input fields for direct entry */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-white/60 text-sm block mb-1">Min Budget</label>
              <input
                type="number"
                min="0"
                max={form.budget.max - 100}
                step="100"
                value={form.budget.min}
                onChange={(e) => {
                  const newMin = parseInt(e.target.value);
                  if (newMin < form.budget.max - 100) {
                    setForm({ 
                      ...form, 
                      budget: { 
                        ...form.budget, 
                        min: newMin
                      } 
                    });
                  }
                }}
                className="w-full bg-white/5 text-white rounded-xl p-3 outline-none"
              />
            </div>
            <div>
              <label className="text-white/60 text-sm block mb-1">Max Budget</label>
              <input
                type="number"
                min={form.budget.min + 100}
                max="5000"
                step="100"
                value={form.budget.max}
                onChange={(e) => {
                  const newMax = parseInt(e.target.value);
                  if (newMax > form.budget.min + 100) {
                    setForm({ 
                      ...form, 
                      budget: { 
                        ...form.budget, 
                        max: newMax
                      } 
                    });
                  }
                }}
                className="w-full bg-white/5 text-white rounded-xl p-3 outline-none"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Number of Rooms - Multiple choice */}
      <motion.div 
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="rounded-2xl bg-white/5 backdrop-blur-sm p-5 ring-1 ring-white/10"
      >
        <div className="flex items-center gap-3 text-white/80 mb-4">
          <Bed size={20} />
          <span className="font-medium">Number of Rooms</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {[1, 2, 3, 4, 5, '6+'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => setForm({ 
                ...form, 
                number_of_rooms: typeof num === 'number' ? num : 6,
                // Match adults to room count as requested
                adults: typeof num === 'number' ? num : 6
              })}
              className={`flex-1 min-w-[80px] py-3 px-4 rounded-xl flex items-center justify-center transition-colors ${
                (typeof num === 'number' && form.number_of_rooms === num) || 
                (num === '6+' && form.number_of_rooms >= 6)
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              {num} {num === 1 ? 'Room' : 'Rooms'}
            </button>
          ))}
        </div>
      </motion.div>

      <div className="flex gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => setCurrentStep('location')}
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
        >
          <ArrowRight size={20} />
          Continue to Preferences
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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col items-center justify-center p-6 bg-black"
    >
      <div className="w-full max-w-2xl space-y-8">
        <motion.div 
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          className="text-center space-y-4"
        >
          <h1 className="text-5xl font-serif text-white">RentLuxe</h1>
          <p className="text-xl text-gray-400 font-light">Find your perfect temporary sanctuary</p>
        </motion.div>

        {/* Progress Indicator - Updated for 3 steps */}
        <div className="flex items-center justify-between mb-8">
          {['location', 'details', 'preferences'].map((step, index) => (
            <React.Fragment key={step}>
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep === step
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    : (currentStep === 'details' && step === 'location') || 
                      (currentStep === 'preferences' && (step === 'location' || step === 'details'))
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/10 text-white/40'
                }`}>
                  {index + 1}
                </div>
                <span className="ml-2 text-sm text-white/60 capitalize">{step}</span>
              </div>
              {index < 2 && (
                <div className={`flex-1 h-px mx-4 ${
                  (currentStep === 'details' && index === 0) || 
                  (currentStep === 'preferences' && index < 2)
                    ? 'bg-purple-500'
                    : 'bg-white/10'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* AI Message */}
        <AnimatePresence>
          {aiMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="rounded-2xl bg-purple-500/10 backdrop-blur-sm p-5 ring-1 ring-purple-500/20"
            >
              <div className="flex items-start gap-3">
                {isLoading ? (
                  <Sparkles className="text-purple-400 mt-1" size={20} />
                ) : (
                  <AlertCircle className="text-purple-400 mt-1" size={20} />
                )}
                <p className="text-purple-200">{aiMessage}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Message */}
        {error && (
          <div className="bg-red-600/20 border border-red-600 text-red-100 p-4 rounded-lg">
            {error}
          </div>
        )}

        {/* Step Content */}
        {currentStep === 'location' && renderLocationStep()}
        {currentStep === 'details' && renderDetailsStep()}
        {currentStep === 'preferences' && renderPreferencesStep()}
      </div>
    </motion.div>
  );
}

export default SearchScreen;