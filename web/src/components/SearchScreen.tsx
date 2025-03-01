import React, { useState } from 'react';
import { Search, Calendar, Users, DollarSign, MapPin, Sparkles, AlertCircle, ArrowLeft, ArrowRight, Clock, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchScreenProps {
  onSearch: (query: string) => void;
  onBack?: () => void;
}

interface SearchForm {
  location: string;
  dates: string;
  guests: number;
  minBudget: string;
  maxBudget: string;
  preferences: string;
}

// Mock previous preferences - in production, this would come from a database
const PREVIOUS_PREFERENCES = [
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

type SearchStep = 'basics' | 'preferences';

function SearchScreen({ onSearch, onBack }: SearchScreenProps) {
  const [currentStep, setCurrentStep] = useState<SearchStep>('basics');
  const [form, setForm] = useState<SearchForm>({
    location: '',
    dates: '',
    guests: 1,
    minBudget: '',
    maxBudget: '',
    preferences: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [showPreviousPreferences, setShowPreviousPreferences] = useState(false);

  const validateBasics = () => {
    const requiredFields = [];
    if (!form.location) requiredFields.push('location');
    if (!form.dates) requiredFields.push('dates');
    if (!form.minBudget || !form.maxBudget) requiredFields.push('budget range');

    if (requiredFields.length > 0) {
      setAiMessage(`Please provide your ${requiredFields.join(', ')} to help me find the best matches for you.`);
      return false;
    }
    return true;
  };

  const handleBasicsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateBasics()) return;
    setCurrentStep('preferences');
    setAiMessage('Now, tell me more about your specific preferences for your ideal home.');
  };

  const handlePreferencesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    setAiMessage('Analyzing your preferences and finding perfect matches...');

    const searchQuery = JSON.stringify({
      ...form,
      budget: {
        min: form.minBudget,
        max: form.maxBudget
      }
    });

    setTimeout(() => {
      onSearch(searchQuery);
    }, 1500);
  };

  const handleSelectPreviousPreference = (preference: string) => {
    setForm({ ...form, preferences: preference });
    setShowPreviousPreferences(false);
  };

  const renderBasicsStep = () => (
    <form onSubmit={handleBasicsSubmit} className="space-y-6">
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
          placeholder="Enter city or neighborhood"
          className="w-full bg-white/5 text-white placeholder-gray-500 rounded-xl p-3 outline-none"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
        />
      </motion.div>

      {/* Dates and Guests */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            value={form.dates}
            onChange={(e) => setForm({ ...form, dates: e.target.value })}
          />
        </motion.div>

        <motion.div 
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="rounded-2xl bg-white/5 backdrop-blur-sm p-5 ring-1 ring-white/10"
        >
          <div className="flex items-center gap-3 text-white/80 mb-2">
            <Users size={20} />
            <span className="font-medium">Guests</span>
          </div>
          <input
            type="number"
            min="1"
            className="w-full bg-white/5 text-white rounded-xl p-3 outline-none"
            value={form.guests}
            onChange={(e) => setForm({ ...form, guests: parseInt(e.target.value) })}
          />
        </motion.div>
      </div>

      {/* Budget Range */}
      <motion.div 
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="rounded-2xl bg-white/5 backdrop-blur-sm p-5 ring-1 ring-white/10"
      >
        <div className="flex items-center gap-3 text-white/80 mb-2">
          <DollarSign size={20} />
          <span className="font-medium">Budget Range (per month)</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="number"
            placeholder="Min budget"
            className="w-full bg-white/5 text-white placeholder-gray-500 rounded-xl p-3 outline-none"
            value={form.minBudget}
            onChange={(e) => setForm({ ...form, minBudget: e.target.value })}
          />
          <input
            type="number"
            placeholder="Max budget"
            className="w-full bg-white/5 text-white placeholder-gray-500 rounded-xl p-3 outline-none"
            value={form.maxBudget}
            onChange={(e) => setForm({ ...form, maxBudget: e.target.value })}
          />
        </div>
      </motion.div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        type="submit"
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium py-4 px-6 rounded-full transition-all hover:from-purple-600 hover:to-pink-600"
      >
        <ArrowRight size={20} />
        Continue to Preferences
      </motion.button>
    </form>
  );

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
              {PREVIOUS_PREFERENCES.map((prev) => (
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
          className="w-full bg-white/5 text-white placeholder-gray-500 rounded-xl p-3 outline-none resize-none"
          placeholder="Tell me more about your ideal home. What makes a place feel special to you? Any specific features or qualities you're looking for?"
          rows={6}
          value={form.preferences}
          onChange={(e) => setForm({ ...form, preferences: e.target.value })}
        />
      </motion.div>

      <div className="flex gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => setCurrentStep('basics')}
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
          <h1 className="text-5xl font-serif italic text-white">RentLuxe</h1>
          <p className="text-xl text-gray-400 font-light">Find your perfect temporary sanctuary</p>
        </motion.div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-8">
          {['basics', 'preferences'].map((step, index) => (
            <React.Fragment key={step}>
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep === step
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    : currentStep === 'preferences' && step === 'basics'
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/10 text-white/40'
                }`}>
                  {index + 1}
                </div>
                <span className="ml-2 text-sm text-white/60 capitalize">{step}</span>
              </div>
              {index < 1 && (
                <div className={`flex-1 h-px mx-4 ${
                  currentStep === 'preferences'
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

        {/* Step Content */}
        {currentStep === 'basics' && renderBasicsStep()}
        {currentStep === 'preferences' && renderPreferencesStep()}
      </div>
    </motion.div>
  );
}

export default SearchScreen;