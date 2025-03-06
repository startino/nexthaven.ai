import React from 'react';
import { motion } from 'framer-motion';
import { Search, Home, Building2, MapPin } from 'lucide-react';

function LoadingScreen() {
  const steps = [
    { icon: Search, text: "Analyzing your preferences..." },
    { icon: Home, text: "Finding perfect matches..." },
    { icon: Building2, text: "Evaluating properties..." },
    { icon: MapPin, text: "Curating your selection..." }
  ];

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-full max-w-md p-8 space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-serif text-white">RentLuxe</h1>
          <p className="text-lg text-gray-400">Our AI agents are working their magic</p>
        </div>

        <div className="space-y-4">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2 }} // Reduced delay between steps
              className="flex items-center gap-4"
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 1.5, // Reduced animation duration
                  repeat: Infinity,
                  delay: index * 0.2,
                }}
                className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center"
              >
                <step.icon className="text-white" size={24} />
              </motion.div>
              <span className="text-white/80">{step.text}</span>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 1.5 }} // Reduced progress bar duration to match new loading time
          className="h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
        />
      </div>
    </div>
  );
}

export default LoadingScreen;