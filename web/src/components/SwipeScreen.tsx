import React, { useState } from 'react';
import { X, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UnifiedProperty } from '../types/unified-property';

interface SwipeScreenProps {
  properties: UnifiedProperty[];
  onLike: (property: UnifiedProperty) => void;
  likedCount: number;
  totalProperties: number;
}

function SwipeScreen({ properties, onLike, likedCount, totalProperties }: SwipeScreenProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const currentProperty = properties[currentIndex];
  const [imageAspectRatios, setImageAspectRatios] = React.useState<Record<string, number>>({});
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullGallery, setShowFullGallery] = useState(false);

  // Function to determine aspect ratio of an image
  const getImageAspectRatio = (imageUrl: string, imageKey: string) => {
    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      setImageAspectRatios(prev => ({
        ...prev,
        [imageKey]: aspectRatio
      }));
    };
    img.src = imageUrl;
  };

  // Load aspect ratios for all images when property changes
  React.useEffect(() => {
    if (!currentProperty) return;
    
    // Reset aspect ratios when property changes
    setImageAspectRatios({});
    setCurrentImageIndex(0);
    setShowFullGallery(false);
    
    // Process all images to get their aspect ratios
    if (currentProperty.media.gallery && currentProperty.media.gallery.length > 0) {
      currentProperty.media.gallery.forEach((image: string, index: number) => {
        getImageAspectRatio(image, `gallery-${index}`);
      });
    }
  }, [currentProperty]);

  // Determine col-span based on aspect ratio
  const getColSpan = (imageKey: string): number => {
    const aspectRatio = imageAspectRatios[imageKey];
    if (!aspectRatio) return 1; // Default to 1 if aspect ratio is not yet determined
    
    // Wide images (landscape orientation) get a col-span of 2
    return aspectRatio >= 1.5 ? 2 : 1;
  };

  const handleSwipe = (liked: boolean) => {
    if (liked) {
      onLike(currentProperty);
    }
    setCurrentIndex((prev) => Math.min(prev + 1, properties.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!currentProperty) return null;

  // Organize gallery images into categories for display
  // Since UnifiedProperty has a flat gallery array, we'll create a visual categorization
  const organizeGalleryImages = () => {
    const gallery = currentProperty.media.gallery || [];
    const totalImages = gallery.length;
    
    // Split gallery into two halves for the new layout
    const firstHalf = gallery.slice(0, Math.ceil(totalImages / 2));
    const secondHalf = gallery.slice(Math.ceil(totalImages / 2));
    
    // Create visual categories based on image position in the array
    const categories = {
      firstHalf: {
        living: firstHalf.slice(0, Math.ceil(firstHalf.length * 0.6)),
        bedroom: firstHalf.slice(Math.ceil(firstHalf.length * 0.6))
      },
      secondHalf: {
        bathroom: secondHalf.slice(0, Math.ceil(secondHalf.length * 0.5)),
        kitchen: secondHalf.slice(Math.ceil(secondHalf.length * 0.5))
      }
    };
    
    return categories;
  };

  const imageCategories = organizeGalleryImages();

  // Get all images including main image
  const getAllImages = () => {
    const mainImage = currentProperty.media.main_image;
    const galleryImages = currentProperty.media.gallery || [];
    return [mainImage, ...galleryImages].filter(Boolean);
  };

  const allImages = getAllImages();

  const renderImageCollage = () => {
    // Ensure we have at least one image
    if (allImages.length === 0) {
      return (
        <div className="h-[70vh] flex items-center justify-center bg-gray-900 rounded-xl">
          <p className="text-white text-xl">No images available</p>
        </div>
      );
    }

    // For the collage view, show the main image and up to 4 preview images
    // with an indicator if there are more images
    return (
      <div className="grid grid-cols-6 grid-rows-2 gap-2 h-[70vh]">
        <div 
          className="col-span-4 row-span-2 relative rounded-xl overflow-hidden cursor-pointer"
          onClick={() => setShowFullGallery(true)}
        >
          <motion.img
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            src={allImages[0]}
            alt="Main view"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
          
          {/* Platform source badge */}
          <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm">
            <span className="text-white text-sm font-medium">
              {currentProperty.source}
            </span>
          </div>
        </div>
        <div className="col-span-2 grid grid-rows-2 gap-2">
          {allImages.slice(1, 5).map((image, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative rounded-xl overflow-hidden cursor-pointer"
              onClick={() => {
                setCurrentImageIndex(index + 1);
                setShowFullGallery(true);
              }}
            >
              <img src={image} alt={`View ${index + 2}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/20" />
              
              {/* Show indicator for last preview image if there are more images */}
              {index === 3 && allImages.length > 5 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <p className="text-white font-bold text-xl">+{allImages.length - 5} more</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  // Full gallery view for all images
  const renderFullGallery = () => {
    return (
      <AnimatePresence>
        {showFullGallery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          >
            <div className="p-4 flex justify-between items-center">
              <button
                onClick={() => setShowFullGallery(false)}
                className="text-white p-2 rounded-full hover:bg-white/10"
              >
                <X size={24} />
              </button>
              <p className="text-white">
                {currentImageIndex + 1} / {allImages.length}
              </p>
            </div>
            
            <div className="flex-1 flex items-center justify-center relative">
              <motion.img
                key={currentImageIndex}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                src={allImages[currentImageIndex]}
                alt={`Gallery image ${currentImageIndex + 1}`}
                className="max-h-full max-w-full object-contain"
              />
              
              {/* Navigation buttons */}
              {currentImageIndex > 0 && (
                <button
                  onClick={() => setCurrentImageIndex(prev => prev - 1)}
                  className="absolute left-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
                >
                  <ChevronLeft size={24} />
                </button>
              )}
              
              {currentImageIndex < allImages.length - 1 && (
                <button
                  onClick={() => setCurrentImageIndex(prev => prev + 1)}
                  className="absolute right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
                >
                  <ChevronRight size={24} />
                </button>
              )}
            </div>
            
            {/* Thumbnail navigation */}
            <div className="p-4 overflow-x-auto">
              <div className="flex gap-2">
                {allImages.map((image, index) => (
                  <div
                    key={index}
                    className={`w-16 h-16 flex-shrink-0 rounded-md overflow-hidden cursor-pointer ${
                      index === currentImageIndex ? 'ring-2 ring-purple-500' : ''
                    }`}
                    onClick={() => setCurrentImageIndex(index)}
                  >
                    <img src={image} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  // Render first half of gallery
  const renderFirstHalfGallery = () => {
    return (
      <div className="space-y-8">
        {Object.entries(imageCategories.firstHalf).map(([category, images]) => (
          images.length > 0 && (
            <div key={category} className="space-y-3">
              <h3 className="text-xl font-semibold text-white/90 capitalize">{category}</h3>
              <div className="grid grid-cols-2 gap-3">
                {images.map((image: string, index: number) => {
                  const imageKey = `${category}-${index}`;
                  const galleryIndex = currentProperty.media.gallery.indexOf(image);
                  return (
                    <motion.div
                      key={imageKey}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`relative aspect-video rounded-xl overflow-hidden cursor-pointer ${
                        getColSpan(imageKey) > 1 ? 'col-span-2' : 'col-span-1'
                      }`}
                      onClick={() => {
                        // Add 1 to account for main image at index 0
                        setCurrentImageIndex(galleryIndex + 1);
                        setShowFullGallery(true);
                      }}
                    >
                      <img 
                        src={image} 
                        alt={`${category} view ${index + 1}`} 
                        className="w-full h-full object-cover"
                        onLoad={() => getImageAspectRatio(image, imageKey)}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )
        ))}
      </div>
    );
  };

  // Render second half of gallery
  const renderSecondHalfGallery = () => {
    return (
      <div className="space-y-8">
        {Object.entries(imageCategories.secondHalf).map(([category, images]) => (
          images.length > 0 && (
            <div key={category} className="space-y-3">
              <h3 className="text-xl font-semibold text-white/90 capitalize">{category}</h3>
              <div className="grid grid-cols-2 gap-3">
                {images.map((image: string, index: number) => {
                  const imageKey = `${category}-${index}`;
                  const galleryIndex = currentProperty.media.gallery.indexOf(image);
                  return (
                    <motion.div
                      key={imageKey}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`relative aspect-video rounded-xl overflow-hidden cursor-pointer ${
                        getColSpan(imageKey) > 1 ? 'col-span-2' : 'col-span-1'
                      }`}
                      onClick={() => {
                        // Add 1 to account for main image at index 0
                        setCurrentImageIndex(galleryIndex + 1);
                        setShowFullGallery(true);
                      }}
                    >
                      <img 
                        src={image} 
                        alt={`${category} view ${index + 1}`} 
                        className="w-full h-full object-cover"
                        onLoad={() => getImageAspectRatio(image, imageKey)}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )
        ))}
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
          <div className="text-2xl font-serif text-white">nexthaven.ai</div>
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
        {renderFullGallery()}

        {/* First Half of Gallery */}
        <div className="px-6 py-8">
          {renderFirstHalfGallery()}
        </div>

        {/* Property Details */}
        <div className="px-6 py-8 space-y-8">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-white">${Math.round(currentProperty.pricing.total)}</h2>
                <p className="text-lg text-gray-300">{currentProperty.location}</p>
              </div>
              <div className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/80 to-pink-500/80 backdrop-blur-sm">
                <span className="text-white font-medium">{currentProperty.source}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm">
                <span className="text-white/90">{currentProperty.capacity.beds} Beds</span>
              </div>
              <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm">
                <span className="text-white/90">{currentProperty.capacity.bedrooms} Bedrooms</span>
              </div>
            </div>
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
              {currentProperty.features.amenities.map((amenity, index) => (
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

        {/* Second Half of Gallery */}
        <div className="px-6 py-8">
          {renderSecondHalfGallery()}
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