import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, ArrowLeft, Sparkles } from 'lucide-react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import { UnifiedProperty } from '../types/unified-property';
import 'react-circular-progressbar/dist/styles.css';

// Score Circle Component
const ScoreCircle = ({ score }: { score: number }) => {
  // Score is already a number in the UnifiedProperty model
  const numericScore = Math.round(score);
  
  // Determine color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#4ade80'; // green for high scores
    if (score >= 60) return '#facc15'; // yellow for medium scores
    return '#ef4444'; // red for low scores
  };
  
  const scoreColor = getScoreColor(numericScore);
  
  return (
    <div className="w-20 h-24 flex flex-col items-center justify-start">
      <div className="w-full h-16 flex items-center justify-center">
        <CircularProgressbar
          value={numericScore}
          maxValue={100}
          text={`${numericScore}`}
          styles={buildStyles({
            rotation: 0,
            strokeLinecap: 'round',
            textSize: '32px',
            pathTransitionDuration: 0.5,
            pathColor: scoreColor,
            textColor: 'white',
            trailColor: '#1e293b',
            backgroundColor: 'transparent',
          })}
        />
      </div>
      <div className="text-xs text-gray-400 mt-3 whitespace-nowrap">out of 100</div>
    </div>
  );
};

interface ComparisonScreenProps {
  properties: UnifiedProperty[];
  onWinnerSelected: (property: UnifiedProperty) => void;
  onBack: () => void;
}

function ComparisonScreen({ properties, onWinnerSelected, onBack }: ComparisonScreenProps) {
  const [selectedProperty, setSelectedProperty] = useState<UnifiedProperty | null>(null);
  const [winner, setWinner] = useState<UnifiedProperty | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const handleWinnerSelection = (property: UnifiedProperty) => {
    setWinner(property);
    setSelectedProperty(null);
    setShowCelebration(true);
    onWinnerSelected(property);
  };

  const renderPropertyCard = (property: UnifiedProperty) => (
    <motion.div
      key={property.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl overflow-hidden ring-1 transition-all cursor-pointer
        ${winner === property ? 'ring-4 ring-purple-500' : 'ring-white/10 hover:ring-purple-500/50'}
        ${selectedProperty?.id === property.id ? 'ring-purple-500' : ''}`}
      onClick={() => setSelectedProperty(property)}
    >
      <div className="relative">
        <img
          src={property.media.main_image}
          alt="Property"
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
        {winner === property && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-3 right-3 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-lg"
          >
            <Crown className="text-white" size={16} />
          </motion.div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="text-xl sm:text-2xl font-bold text-white">${Math.round(property.pricing.total)}</div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex justify-between items-start gap-3">
          <div className="space-y-2 flex-1">
            <p className="text-gray-400 text-sm line-clamp-2 font-medium">{property.name}</p>
            <p className="text-gray-500 text-xs">{property.location}</p>
            {property.features.amenities && property.features.amenities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {property.features.amenities.slice(0, 3).map((amenity, idx) => (
                  <span key={idx} className="text-xs bg-white/10 rounded-full px-2 py-1 text-gray-300">
                    {amenity}
                  </span>
                ))}
                {property.features.amenities.length > 3 && (
                  <span className="text-xs bg-white/10 rounded-full px-2 py-1 text-gray-300">
                    +{property.features.amenities.length - 3}
                  </span>
                )}
              </div>
            )}
            {property.reasoning && (
              <p className="text-xs text-gray-300 italic line-clamp-2 mt-2">
               {property.reasoning.split('.')[0]}.
              </p>
            )}
          </div>
          <ScoreCircle score={property.score} />
        </div>
      </div>
    </motion.div>
  );

  const renderCelebration = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center space-y-6"
      >
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
          }}
          className="inline-block"
        >
          <Sparkles className="text-purple-500" size={64} />
        </motion.div>
        <h2 className="text-4xl font-bold text-white">Congratulations!</h2>
        <p className="text-xl text-gray-400">You've found your perfect home</p>
        <div className="flex justify-center">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-r from-purple-500 to-pink-500 p-px rounded-2xl"
          >
            <div className="bg-black rounded-2xl p-4">
              <img
                src={winner?.media.main_image}
                alt="Selected Property"
                className="w-64 h-48 object-cover rounded-xl"
              />
              <div className="mt-4">
                <div className="text-2xl font-bold text-white">{winner?.name}</div>
                <div className="text-gray-400">{winner?.location}</div>
              </div>
              <div className="mt-4 flex justify-center">
                <ScoreCircle score={winner?.score || 0} />
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-black px-4 py-6 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <button
            onClick={onBack}
            id="btn-comparison-back"
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors p-2 -ml-2"
          >
            <ArrowLeft size={20} className="sm:w-6 sm:h-6" />
            <span className="text-sm sm:text-base">Back</span>
          </button>
          <h1 className="text-xl sm:text-3xl font-serif italic text-white">Your Perfect Matches</h1>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {properties.map((property) => renderPropertyCard(property))}
        </div>
      </div>

      <AnimatePresence>
        {selectedProperty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 overflow-hidden"
          >
            <div className="min-h-screen max-h-screen overflow-y-auto">
              <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-sm shadow-md">
                <div className="flex items-center justify-between p-4">
                  <button
                    onClick={() => setSelectedProperty(null)}
                    id="btn-close-property-details"
                    className="flex items-center gap-2 text-white/80 hover:text-white p-2 -ml-2"
                  >
                    <ArrowLeft size={20} />
                    <span>Back</span>
                  </button>
                  {!winner && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleWinnerSelection(selectedProperty)}
                      id="btn-select-winner"
                      className="px-4 py-2 sm:px-6 sm:py-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold flex items-center gap-2 text-sm sm:text-base shadow-lg"
                    >
                      <Crown size={16} className="sm:w-5 sm:h-5" />
                      <span>Select as Winner</span>
                    </motion.button>
                  )}
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 bg-black">
                <div className="space-y-3">
                  <h3 className="text-lg sm:text-xl font-semibold text-white/90 capitalize">Gallery</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedProperty.media.gallery.map((image: string, index: number) => (
                      <motion.div
                        key={`${index}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="relative aspect-video rounded-xl overflow-hidden bg-gray-900"
                      >
                        <img 
                          src={image} 
                          alt={`${index} view ${index + 1}`} 
                          className="w-full h-full object-cover" 
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="space-y-5 sm:space-y-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">${Math.round(selectedProperty.pricing.total)}</h2>
                    <p className="text-lg text-gray-300">{selectedProperty.location}</p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm">
                      <span className="text-white/90">{selectedProperty.capacity.beds} Beds</span>
                    </div>
                    <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm">
                      <span className="text-white/90">{selectedProperty.capacity.bedrooms} Bedrooms</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <ScoreCircle score={selectedProperty.score} />
                    <div>
                      <h3 className="text-lg sm:text-xl font-semibold text-white/90">Property Score</h3>
                      <p className="text-sm text-gray-400">AI-powered evaluation based on your preferences</p>
                    </div>
                  </div>
                  
                  {selectedProperty.reasoning && (
                    <div className="space-y-3 p-4 bg-white/5 rounded-xl">
                      <h3 className="text-lg sm:text-xl font-semibold text-white/90">Match Analysis</h3>
                      <p className="text-gray-300 leading-relaxed whitespace-pre-line text-sm sm:text-base">{selectedProperty.reasoning}</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h3 className="text-lg sm:text-xl font-semibold text-white/90">About this property</h3>
                    <p className="text-gray-400 leading-relaxed text-sm sm:text-base">{selectedProperty.description || selectedProperty.name}</p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg sm:text-xl font-semibold text-white/90">Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProperty.features.amenities.map((amenity, index) => (
                        <motion.span
                          key={index}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-purple-100/10 text-purple-200 text-sm"
                        >
                          {amenity}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        {showCelebration && renderCelebration()}
      </AnimatePresence>
    </div>
  );
}

export default ComparisonScreen;