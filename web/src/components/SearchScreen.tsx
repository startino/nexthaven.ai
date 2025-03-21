import React, { useState, useEffect } from "react";
import {
  Search,
  Calendar,
  Users,
  DollarSign,
  MapPin,
  Sparkles,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Clock,
  Plus,
  Bed,
  Home,
<<<<<<< HEAD
=======
  LogIn,
>>>>>>> 9f04840 (feat(auth): implement authentication)
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { propertyService } from "../services/api";
import LoadingScreen from "./LoadingScreen";
<<<<<<< HEAD
=======
import { useAuth } from "../context/AuthContext";
>>>>>>> 9f04840 (feat(auth): implement authentication)

interface SearchScreenProps {
  onSearch: (query: string) => void;
  onBack?: () => void;
  onNavigateToAuth: () => void;
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
  sessionId: string | null;
}

// Default form values
const DEFAULT_FORM_VALUES = {
  query: "",
  date: "",
  budget: { min: 420, max: 600 }, // Set min to 70% of max
  adults: 2,
  number_of_rooms: 1,
  preferences: "",
  sessionId: null,
};

// Function to get previous preferences from local storage
const getPreviousPreferences = () => {
  try {
    const storedPreferences = localStorage.getItem("previousPreferences");
    if (storedPreferences) {
      return JSON.parse(storedPreferences);
    }
  } catch (error) {
    console.error("Error retrieving preferences from local storage:", error);
  }

  // Default preferences if none found in local storage
  return [
    {
      id: 1,
      date: "2025-03-15",
      preferences:
        "Modern apartment with a home office setup, high-speed internet, and a quiet neighborhood. Must have in-unit laundry and a balcony.",
    },
  ];
};

// Define default locations
const DEFAULT_LOCATIONS = [
  { name: "Kuala Lumpur", country: "Malaysia" },
  { name: "Bali", country: "Indonesia" },
  { name: "Da Nang", country: "Vietnam" },
];

// Define recommended time options - split into when and period
const WHEN_OPTIONS = [
  { label: "Next Week", value: "Next Week" },
  { label: "Two Weeks", value: "In Two Weeks" },
  { label: "Next Month", value: "Next Month" },
];

const PERIOD_OPTIONS = [
  { label: "1 Week", value: "for 1 Week" },
  { label: "1 Month", value: "for 1 Month" },
  { label: "3 Months", value: "for 3 Months" },
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
type SearchStep = "location" | "details" | "preferences";

// Define the type for preferences
interface Preference {
  id: number;
  date: string;
  preferences: string;
}

<<<<<<< HEAD
function SearchScreen({ onSearch, onBack, error }: SearchScreenProps) {
=======
function SearchScreen({
  onSearch,
  onBack,
  onNavigateToAuth,
  error,
}: SearchScreenProps) {
  const { user, loading: authLoading } = useAuth();
>>>>>>> 9f04840 (feat(auth): implement authentication)
  const [currentStep, setCurrentStep] = useState<SearchStep>("location");
  const [form, setForm] = useState<SearchForm>(DEFAULT_FORM_VALUES);
  const [isLoading, setIsLoading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [showPreviousPreferences, setShowPreviousPreferences] = useState(false);
  const [previousPreferences, setPreviousPreferences] = useState<Preference[]>(
    getPreviousPreferences()
  );

<<<<<<< HEAD
=======
  // If user is not authenticated, show authentication prompt
  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-gradient-to-br from-gray-900 to-black p-8 rounded-xl shadow-lg border border-gray-800 text-center">
          <div className="mb-6">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-700 to-pink-700 flex items-center justify-center">
              <Search size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-serif text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
              Authentication Required
            </h2>
          </div>

          <p className="text-gray-300 mb-6">
            Please sign in to access our advanced accommodation search features
          </p>

          <button
            onClick={onNavigateToAuth}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-700 to-pink-700 text-white p-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            <LogIn size={20} />
            <span>Sign In</span>
          </button>
        </div>
      </div>
    );
  }

>>>>>>> 9f04840 (feat(auth): implement authentication)
  // Ensure budget is properly initialized
  useEffect(() => {
    if (!form.budget.max || form.budget.max === 0) {
      setForm((prev) => ({
        ...prev,
        budget: DEFAULT_FORM_VALUES.budget,
      }));
    }
  }, [form.budget.max]);

  // Validate location step
  const validateLocationStep = () => {
    const requiredFields = [];
    if (!form.query) requiredFields.push("location");
    if (!form.date) requiredFields.push("dates");

    if (requiredFields.length > 0) {
      setAiMessage(
        `Please provide your ${requiredFields.join(
          ", "
        )} to help me find the best matches for you.`
      );
      return false;
    }
    return true;
  };

  // Validate details step
  const validateDetailsStep = () => {
    // Ensure budget is valid
    if (!form.budget.max || form.budget.max < 100) {
      setAiMessage("Please enter a valid budget (minimum $100)");
      // Set default budget if invalid
      setForm((prev) => ({
        ...prev,
        budget: DEFAULT_FORM_VALUES.budget,
      }));
      return false;
    }

    // Ensure date is provided
    if (!form.date.trim()) {
      setAiMessage("Please provide your travel dates");
      return false;
    }

    return true;
  };

  // Handle location step submission
  const handleLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLocationStep()) return;
    setCurrentStep("details");
  };

  // Handle details step submission
  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateDetailsStep()) return;

    // Start the property query
    setIsLoading(true);

    try {
      // Call the query endpoint to start the property search
      const sessionId = await propertyService.queryProperties({
        query: form.query,
        date: form.date,
        budget: form.budget,
        adults: form.adults,
        children: 0, // Default to 0
        number_of_rooms: form.number_of_rooms,
      });

      // Update form with session ID
      setForm({
        ...form,
        sessionId,
        // If preferences is empty, reset to template
        preferences: form.preferences.trim()
          ? form.preferences
          : PREFERENCE_TEMPLATE,
      });

      // Proceed to preferences step
      setCurrentStep("preferences");
    } catch (error) {
      console.error("Error starting property search:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setAiMessage(`Error starting property search: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle preferences step submission
  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Ensure we have a session ID
    if (!form.sessionId) {
      setAiMessage("Error: No active property search session");
      return;
    }

    setIsLoading(true);
    setIsEvaluating(true);

    // Save preferences to local storage
    const newPreference = {
      id: Date.now(),
      date: new Date().toISOString().split("T")[0],
      preferences: form.preferences,
    };

    try {
      // Save to local storage
      const updatedPreferences = [
        newPreference,
<<<<<<< HEAD
        ...previousPreferences.slice(0, 5),
      ]; // Keep only the 6 most recent
=======
        ...previousPreferences.slice(0, 4),
      ]; // Keep only the 5 most recent
>>>>>>> 9f04840 (feat(auth): implement authentication)
      localStorage.setItem(
        "previousPreferences",
        JSON.stringify(updatedPreferences)
      );

      // Create a legacy-format search query for backward compatibility
      const searchQuery = JSON.stringify({
        sessionId: form.sessionId,
        preferences: form.preferences,
        // Include these for backward compatibility
        query: form.query,
        date: form.date,
        budget: form.budget,
        adults: form.adults,
        children: 0,
        number_of_rooms: form.number_of_rooms,
      });

      // Pass the results to the parent component
      setTimeout(() => {
        onSearch(searchQuery);
      }, 1500);
    } catch (error) {
      console.error("Error evaluating properties:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setAiMessage(`Error evaluating properties: ${errorMessage}`);
      setIsLoading(false);
      setIsEvaluating(false);
    }
  };

  const handleSelectPreviousPreference = (preference: string) => {
    setForm({ ...form, preferences: preference });
    setShowPreviousPreferences(false);
  };

  // Reset form to default values
  const resetForm = () => {
    setForm(DEFAULT_FORM_VALUES);
  };

  // Reset preferences to template
  const resetToTemplate = () => {
    setForm({ ...form, preferences: PREFERENCE_TEMPLATE });
  };

  // Format price to be pretty
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
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
                id={`btn-location-${location.name
                  .toLowerCase()
                  .replace(/\s/g, "-")}`}
                onClick={() =>
                  setForm({
                    ...form,
                    query: `${location.name}, ${location.country}`,
                  })
                }
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
                id={`btn-when-${option.label
                  .toLowerCase()
                  .replace(/\s/g, "-")}`}
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
                    ? "bg-purple-500/30 text-white"
                    : "bg-white/10 hover:bg-white/20 text-white/80"
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
                id={`btn-period-${option.label
                  .toLowerCase()
                  .replace(/\s/g, "-")}`}
                onClick={() => {
                  // Extract any existing "when" part (before "for")
                  const currentWhen = form.date.split(" for ")[0].trim();

                  // Only use the currentWhen if it's not empty and not just the period
                  const whenPart =
                    currentWhen &&
                    !PERIOD_OPTIONS.some(
                      (p) => p.value === `for ${currentWhen}`
                    )
                      ? currentWhen
                      : "";

                  // Combine any existing "when" with the new period
                  const newDate = whenPart
                    ? `${whenPart} ${option.value}`
                    : option.value.startsWith("for ")
                    ? option.value.substring(4)
                    : option.value;

                  setForm({ ...form, date: newDate });
                }}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  form.date.includes(option.value)
                    ? "bg-purple-500/30 text-white"
                    : "bg-white/10 hover:bg-white/20 text-white/80"
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
        id="btn-continue-to-details"
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium py-4 px-6 rounded-xl sm:rounded-full transition-all hover:from-purple-600 hover:to-pink-600 shadow-lg"
      >
        {isLoading ? (
          <>
            <Clock className="animate-spin" size={20} />
            <span>Processing...</span>
          </>
        ) : (
          <>
            <span>Continue to Details</span>
            <ArrowRight size={20} />
          </>
        )}
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
            <span className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-white/60">
              $
            </span>
            <input
              type="number"
              min="100"
              step="50"
              value={
                form.budget.max === 0
                  ? DEFAULT_FORM_VALUES.budget.max
                  : form.budget.max
              }
              onChange={(e) => {
                const newMax =
                  parseInt(e.target.value) || DEFAULT_FORM_VALUES.budget.max; // Default to 600 if invalid
                // Calculate minimum as 70% of maximum (can be adjusted)
                const calculatedMin = Math.floor(newMax * 0.7);
                setForm({
                  ...form,
                  budget: {
                    min: calculatedMin,
                    max: newMax,
                  },
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
              id={`btn-room-${num}`}
              onClick={() =>
                setForm({
                  ...form,
                  number_of_rooms: num,
                })
              }
              className={`py-3 sm:py-4 rounded-lg flex items-center justify-center transition-colors ${
                form.number_of_rooms === num
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                  : "bg-white/10 text-white/60 hover:bg-white/20"
              }`}
            >
              {num} {num === 1 ? "Room" : "Rooms"}
            </button>
          ))}
        </div>
      </motion.div>

      <div className="flex gap-3 sm:gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          id="btn-back-to-location"
          onClick={() => setCurrentStep("location")}
          className="flex-1 flex items-center justify-center gap-2 bg-white/10 text-white font-medium py-4 px-4 sm:px-6 rounded-xl sm:rounded-full transition-all hover:bg-white/20"
        >
          <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
          <span className="text-sm sm:text-base">Back</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          id="btn-continue-to-preferences"
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium py-4 px-4 sm:px-6 rounded-xl sm:rounded-full transition-all hover:from-purple-600 hover:to-pink-600 shadow-lg"
        >
          {isLoading ? (
            <>
              <Clock className="animate-spin" size={18} />
              <span className="text-sm sm:text-base">Processing...</span>
            </>
          ) : (
            <>
              <span className="text-sm sm:text-base">Continue</span>
              <ArrowRight size={18} className="sm:w-5 sm:h-5" />
            </>
          )}
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
            id="btn-toggle-previous-preferences"
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
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 mb-4"
            >
              {previousPreferences.map((prev: Preference) => (
                <motion.button
                  key={prev.id}
                  type="button"
                  id={`btn-select-preference-${prev.id}`}
                  onClick={() =>
                    handleSelectPreviousPreference(prev.preferences)
                  }
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
                id="btn-close-preferences"
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
          placeholder="Tell me more about your ideal stay. What makes a place feel special to you? Any specific features or qualities you're looking for?"
          rows={12}
          value={form.preferences}
          onChange={(e) => setForm({ ...form, preferences: e.target.value })}
          onBlur={(e) => {
            // If the textarea is empty or just whitespace, reset to template
            if (!e.target.value.trim()) {
              resetToTemplate();
            }
          }}
          style={{ lineHeight: "1.6" }}
        />
        <div className="flex justify-between items-center">
          <p className="text-xs text-white/50 italic">
            Fill out the template above with your preferences or write your own
            description.
          </p>
          <button
            type="button"
            id="btn-reset-template"
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
          id="btn-back-to-details"
          onClick={() => setCurrentStep("details")}
          className="flex-1 flex items-center justify-center gap-2 bg-white/10 text-white font-medium py-4 px-6 rounded-full transition-all hover:bg-white/20"
        >
          <ArrowLeft size={20} />
          Back
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          id="btn-discover-properties"
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-700 to-pink-700 text-white font-medium py-4 px-6 rounded-full transition-all hover:from-purple-600 hover:to-pink-600"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Clock className="animate-spin" size={20} />
              Finding Perfect Matches...
            </>
          ) : (
            <>
              <Search size={20} />
              Discover Properties
            </>
          )}
        </motion.button>
      </div>
    </form>
  );

  // Render the appropriate step
  if (isEvaluating) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8 text-center md:text-left">
          {onBack && (
            <button
              onClick={onBack}
              id="btn-search-back"
              className="flex items-center gap-2 text-white/80 hover:text-white mb-4"
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
          )}
          <h1 className="text-2xl sm:text-3xl font-serif text-white">
            Find your perfect stay
          </h1>
          <p className="text-gray-400 mt-2">Tell us what you're looking for</p>
        </div>

        {/* AI Message - Only show if there is one */}
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
          {currentStep === "location" && renderLocationStep()}
          {currentStep === "details" && renderDetailsStep()}
          {currentStep === "preferences" && renderPreferencesStep()}
        </div>
      </div>
    </div>
  );
}

export default SearchScreen;
