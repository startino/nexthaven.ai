import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, ArrowLeft } from 'lucide-react';
import { PropertyResult } from '../services/api';

interface Property {
  id: number;
  summary_image: string;
  price: string;
  location: string;
  beds: number;
  baths: number;
  sqft: number;
}

interface BookingScreenProps {
  property: PropertyResult;
  onBack: () => void;
}

function BookingScreen({ property, onBack }: BookingScreenProps) {
  // Mock booking.com URL - in production this would be a real affiliate link
  const bookingUrl = property.url;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="min-h-screen bg-black"
    >
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm">
        <div className="flex items-center gap-4 p-4">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="text-white" size={24} />
          </button>
          <h1 className="text-2xl font-serif italic text-white">Complete Your Booking</h1>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto space-y-8">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative rounded-2xl overflow-hidden"
        >
          <img
            src={property.image}
            alt="Property"
            className="w-full h-64 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h2 className="text-3xl font-bold text-white">{property.price}</h2>
            <p className="text-xl text-white/90">{property.location}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 space-y-6"
        >
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold text-white">Ready to Book?</h3>
              <p className="text-gray-400">Complete your reservation on Booking.com</p>
            </div>
            <motion.a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold flex items-center gap-2 hover:from-purple-600 hover:to-pink-600 transition-all"
            >
              <span>Book Now</span>
              <ExternalLink size={20} />
            </motion.a>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{property.rooms}</div>
              <div className="text-sm text-gray-400">Bedrooms</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{property.baths}</div>
              <div className="text-sm text-gray-400">Bathrooms</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 space-y-4"
        >
          <h3 className="text-xl font-semibold text-white">What's Next?</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3 text-gray-400">
              <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white text-sm">1</span>
              </div>
              <p>Click the "Book Now" button to proceed to Booking.com</p>
            </li>
            <li className="flex items-start gap-3 text-gray-400">
              <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white text-sm">2</span>
              </div>
              <p>Review property details and availability on Booking.com</p>
            </li>
            <li className="flex items-start gap-3 text-gray-400">
              <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white text-sm">3</span>
              </div>
              <p>Complete your reservation securely through their platform</p>
            </li>
          </ul>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default BookingScreen