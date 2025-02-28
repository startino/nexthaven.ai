import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, ArrowLeft, Sparkles } from 'lucide-react';

interface PropertyImages {
  living: string[];
  bedroom: string[];
  bathroom: string[];
  kitchen: string[];
}

interface Property {
  id: number;
  summary_image: string;
  images: PropertyImages;
  price: string;
  location: string;
  beds: number;
  baths: number;
  sqft: number;
  description: string;
  amenities: string[];
}

interface ComparisonScreenProps {
  properties: Property[];
  onWinnerSelected: (property: Property) => void;
  onBack: () => void;
}

function ComparisonScreen({ properties, onWinnerSelected, onBack }: ComparisonScreenProps) {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [winner, setWinner] = useState<Property | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const handleWinnerSelection = (property: Property) => {
    setWinner(property);
    setSelectedProperty(null);
    setShowCelebration(true);
    onWinnerSelected(property);
  };

  const renderPropertyCard = (property: Property) => (
    <motion.div
      key={property.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden ring-1 transition-all cursor-pointer
        ${winner === property ? 'ring-4 ring-purple-500' : 'ring-white/10 hover:ring-purple-500/50'}
        ${selectedProperty?.id === property.id ? 'ring-purple-500' : ''}`}
      onClick={() => setSelectedProperty(property)}
    >
      <div className="relative">
        <img
          src={property.images.living[0]}
          alt="Property"
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
        {winner === property && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center"
          >
            <Crown className="text-white" size={24} />
          </motion.div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="text-2xl font-bold text-white">{property.price}</div>
          <div className="text-gray-300">{property.location}</div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex justify-between text-gray-300">
          <div className="text-center">
            <div className="font-semibold">{property.beds}</div>
            <div className="text-sm text-gray-500">Beds</div>
          </div>
          <div className="text-center">
            <div className="font-semibold">{property.baths}</div>
            <div className="text-sm text-gray-500">Baths</div>
          </div>
          <div className="text-center">
            <div className="font-semibold">{property.sqft}</div>
            <div className="text-sm text-gray-500">sqft</div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-gray-400 text-sm line-clamp-3">{property.description}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {property.amenities.slice(0, 3).map((amenity, index) => (
            <span
              key={index}
              className="px-3 py-1 rounded-full bg-purple-100/10 text-xs text-purple-200"
            >
              {amenity}
            </span>
          ))}
          {property.amenities.length > 3 && (
            <span className="px-3 py-1 rounded-full bg-purple-100/10 text-xs text-purple-200">
              +{property.amenities.length - 3} more
            </span>
          )}
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
                src={winner?.images.living[0]}
                alt="Selected Property"
                className="w-64 h-48 object-cover rounded-xl"
              />
              <div className="mt-4">
                <div className="text-2xl font-bold text-white">{winner?.price}</div>
                <div className="text-gray-400">{winner?.location}</div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft size={24} />
          <span>Back to Search</span>
        </button>
        <h1 className="text-3xl font-serif italic text-white">Your Perfect Matches</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {properties.map((property) => renderPropertyCard(property))}
      </div>

      <AnimatePresence>
        {selectedProperty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 overflow-y-auto z-50"
          >
            <div className="min-h-screen">
              <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm">
                <div className="flex items-center justify-between p-4">
                  <button
                    onClick={() => setSelectedProperty(null)}
                    className="flex items-center gap-2 text-white/80 hover:text-white"
                  >
                    <ArrowLeft size={24} />
                    <span>Back to Comparison</span>
                  </button>
                  {!winner && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleWinnerSelection(selectedProperty)}
                      className="px-6 py-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold flex items-center gap-2"
                    >
                      <Crown size={20} />
                      <span>Select as Winner</span>
                    </motion.button>
                  )}
                </div>
              </div>

              <div className="p-6 space-y-8">
                {Object.entries(selectedProperty.images).map(([category, images]) => (
                  <div key={category} className="space-y-3">
                    <h3 className="text-xl font-semibold text-white/90 capitalize">{category}</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {images.map((image, index) => (
                        <motion.div
                          key={`${category}-${index}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="relative aspect-video rounded-xl overflow-hidden"
                        >
                          <img src={image} alt={`${category} view ${index + 1}`} className="w-full h-full object-cover" />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold text-white">{selectedProperty.price}</h2>
                    <p className="text-xl text-gray-300">{selectedProperty.location}</p>
                  </div>

                  <div className="flex gap-4">
                    <div className="px-4 py-2 rounded-full bg-white/10">
                      <span className="text-white/90">{selectedProperty.beds} Beds</span>
                    </div>
                    <div className="px-4 py-2 rounded-full bg-white/10">
                      <span className="text-white/90">{selectedProperty.baths} Baths</span>
                    </div>
                    <div className="px-4 py-2 rounded-full bg-white/10">
                      <span className="text-white/90">{selectedProperty.sqft} sqft</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xl font-semibold text-white/90">About this property</h3>
                    <p className="text-gray-400 leading-relaxed">{selectedProperty.description}</p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xl font-semibold text-white/90">Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProperty.amenities.map((amenity, index) => (
                        <motion.span
                          key={index}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className="px-4 py-2 rounded-full bg-purple-100/10 text-purple-200"
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