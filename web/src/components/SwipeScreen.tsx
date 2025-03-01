import React from 'react';
import { X, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

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

interface SwipeScreenProps {
  properties: Property[];
  onLike: (property: Property) => void;
  likedCount: number;
  totalProperties: number;
}

function SwipeScreen({ properties, onLike, likedCount, totalProperties }: SwipeScreenProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const currentProperty = properties[currentIndex];

  const handleSwipe = (liked: boolean) => {
    if (liked) {
      onLike(currentProperty);
    }
    setCurrentIndex((prev) => Math.min(prev + 1, properties.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!currentProperty) return null;

  const renderImageCollage = () => {
    const allImages = [
      ...currentProperty.images.living,
      ...currentProperty.images.bedroom,
      ...currentProperty.images.bathroom,
      ...currentProperty.images.kitchen
    ].slice(0, 5);

    return (
      <div className="grid grid-cols-6 grid-rows-2 gap-2 h-[70vh]">
        <div className="col-span-4 row-span-2 relative rounded-xl overflow-hidden">
          <motion.img
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            src={allImages[0]}
            alt="Main view"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
        </div>
        <div className="col-span-2 grid grid-rows-2 gap-2">
          {allImages.slice(1, 5).map((image, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative rounded-xl overflow-hidden"
            >
              <img src={image} alt={`View ${index + 2}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/20" />
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm"
      >
        <div className="p-4 flex items-center justify-between">
          <div className="text-2xl font-serif italic text-white">RentLuxe</div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-1 rounded-full bg-purple-100/10">
              <span className="text-purple-200 text-sm font-medium">
                Property {currentIndex + 1} of {totalProperties}
              </span>
            </div>
            <div className="px-4 py-1 rounded-full bg-purple-100/10">
              <span className="text-purple-200 text-sm font-medium">
                {likedCount}/3 Selected
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="relative">
        {renderImageCollage()}

        {/* Property Details */}
        <div className="px-6 py-8 space-y-8">
          <div className="space-y-4">
            <div>
              <h2 className="text-3xl font-bold text-white">{currentProperty.price}</h2>
              <p className="text-lg text-gray-300">{currentProperty.location}</p>
            </div>

            <div className="flex gap-4">
              <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm">
                <span className="text-white/90">{currentProperty.beds} Beds</span>
              </div>
              <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm">
                <span className="text-white/90">{currentProperty.baths} Baths</span>
              </div>
              <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm">
                <span className="text-white/90">{currentProperty.sqft} sqft</span>
              </div>
            </div>
          </div>

          {/* Image Categories */}
          <div className="space-y-8">
            {Object.entries(currentProperty.images).map(([category, images]) => (
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
          </div>

          {/* Description */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white/90">About this property</h3>
            <p className="text-gray-400 leading-relaxed">{currentProperty.description}</p>
          </div>

          {/* Amenities */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white/90">Amenities</h3>
            <div className="flex flex-wrap gap-2">
              {currentProperty.amenities.map((amenity, index) => (
                <motion.span
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="px-4 py-2 rounded-full bg-purple-100/10 backdrop-blur-sm text-purple-200"
                >
                  {amenity}
                </motion.span>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons - Now fixed to bottom */}
        <div className="fixed bottom-0 left-0 right-0 z-20 flex justify-center gap-4 p-4 bg-gradient-to-t from-black via-black/95 to-transparent">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSwipe(false)}
            className="w-16 h-16 flex items-center justify-center rounded-full bg-red-500/90 backdrop-blur-sm text-white shadow-lg hover:bg-red-600 transition-all"
          >
            <X size={32} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSwipe(true)}
            className="w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            <Heart size={32} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

export default SwipeScreen;