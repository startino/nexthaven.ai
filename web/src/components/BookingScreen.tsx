import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, ArrowLeft } from 'lucide-react';
import { UnifiedProperty } from '../types/unified-property';

interface BookingScreenProps {
  property: UnifiedProperty;
  onBack: () => void;
}

function BookingScreen({ property, onBack }: BookingScreenProps) {
  // Use the property URL from the unified property
  const bookingUrl = property.url;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="min-h-screen bg-black"
    >
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm">
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={onBack}
            id="btn-booking-back"
            className="p-2 rounded-full hover:bg-white/10 transition-colors -ml-2"
          >
            <ArrowLeft className="text-white" size={20} />
          </button>
          <h1 className="text-xl sm:text-2xl font-serif italic text-white">Complete Your Booking</h1>
        </div>
      </div>

      <div className="px-4 py-4 sm:p-6 max-w-4xl mx-auto space-y-6 sm:space-y-8">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-lg"
        >
          <img
            src={property.media.main_image}
            alt={property.name}
            className="w-full h-48 sm:h-64 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4 sm:p-6">
            <h2 className="text-xl sm:text-3xl font-bold text-white">{property.name}</h2>
            <p className="text-base sm:text-xl text-white/80">{property.location}</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8">
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-5"
          >
            <div className="bg-white/5 rounded-xl p-4 sm:p-6 space-y-4 shadow-md">
              <h3 className="text-lg sm:text-xl font-bold text-white">Property Details</h3>
              
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-purple-500/20 p-3 sm:p-4 rounded-lg border border-purple-500/30">
                  <p className="text-xs sm:text-sm text-purple-300 font-medium">Total price</p>
                  <p className="text-lg sm:text-2xl font-bold text-white">${Math.round(property.pricing.total)}</p>
                </div>
              </div>
              
              <div className="flex gap-4 text-white">
                <div>
                  <span className="font-bold">{property.capacity.bedrooms}</span> bedrooms
                </div>
                <div>
                  <span className="font-bold">{property.capacity.beds}</span> beds
                </div>
              </div>
              
              {property.description && (
                <div>
                  <h4 className="text-white font-semibold mb-2">Description</h4>
                  <p className="text-gray-300 text-sm sm:text-base">{property.description}</p>
                </div>
              )}
            </div>
            
            <div className="bg-white/5 rounded-xl p-4 sm:p-6 shadow-md">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Amenities</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {property.features.amenities.map((amenity, index) => (
                  <div key={index} className="flex items-center gap-2 text-gray-300">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    {amenity}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-5"
          >
            <div className="bg-white/5 rounded-xl p-4 sm:p-6 shadow-md">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">AI Recommendation</h3>
              <div className="flex items-center gap-3 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                  {property.score}
                </div>
                <div>
                  <p className="text-white font-semibold">Match Score</p>
                  <p className="text-xs sm:text-sm text-gray-400">Based on your preferences</p>
                </div>
              </div>
              <p className="text-gray-300 italic text-sm sm:text-base">{property.reasoning}</p>
            </div>
            
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-4 sm:p-6 space-y-4 shadow-lg">
              <h3 className="text-lg sm:text-xl font-bold text-white">Ready to book?</h3>
              <p className="text-white/80 text-sm sm:text-base">Complete your reservation on {property.source === 'Booking.com' ? 'Booking.com' : 'Airbnb'}</p>
              
              <a 
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                id="btn-complete-booking"
                className="block w-full bg-white text-purple-700 font-bold py-3 px-4 rounded-lg hover:bg-gray-100 transition-colors text-center flex items-center justify-center gap-2 shadow-md"
              >
                <ExternalLink size={18} className="sm:w-5 sm:h-5" />
                Complete Booking
              </a>
              
              <p className="text-xs text-white/60 text-center">
                You'll be redirected to {property.source === 'Booking.com' ? 'Booking.com' : 'Airbnb'} to complete your reservation
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

export default BookingScreen;