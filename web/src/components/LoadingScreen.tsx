import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Home, Building2, MapPin, Database, Brain, Star, CheckCircle } from 'lucide-react';

function LoadingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  
  // More detailed steps for a longer loading experience
  const steps = [
    { icon: Search, text: "Analyzing your preferences...", duration: 15 },
    { icon: Database, text: "Searching property databases...", duration: 20 },
    { icon: Building2, text: "Evaluating property features...", duration: 25 },
    { icon: MapPin, text: "Analyzing location data...", duration: 20 },
    { icon: Brain, text: "Running AI matching algorithms...", duration: 30 },
    { icon: Star, text: "Calculating property scores...", duration: 25 },
    { icon: Home, text: "Curating your perfect matches...", duration: 20 },
    { icon: CheckCircle, text: "Finalizing results...", duration: 15 }
  ];
  
  // Total expected duration in seconds (2-5 minutes)
  const totalDuration = steps.reduce((acc, step) => acc + step.duration, 0);
  
  useEffect(() => {
    // Update time elapsed every second
    const timeInterval = setInterval(() => {
      setTimeElapsed(prev => {
        const newTime = prev + 1;
        // Calculate overall progress based on time
        const newProgress = Math.min(100, (newTime / totalDuration) * 100);
        setProgress(newProgress);
        
        // Determine which step we should be on based on progress
        let durationSum = 0;
        for (let i = 0; i < steps.length; i++) {
          durationSum += steps[i].duration;
          if (newTime <= durationSum) {
            setCurrentStep(i);
            break;
          }
        }
        
        return newTime;
      });
    }, 1000);
    
    return () => clearInterval(timeInterval);
  }, []);
  
  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Estimated time remaining
  const timeRemaining = Math.max(0, totalDuration - timeElapsed);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-full max-w-md p-8 space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-serif text-white">nexthaven.ai</h1>
          <p className="text-lg text-gray-400">Our AI agents are working their magic</p>
          <p className="text-sm text-gray-500">This may take a few minutes</p>
        </div>

        <div className="space-y-4">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0.3 }}
              animate={{ 
                opacity: index === currentStep ? 1 : (index < currentStep ? 0.7 : 0.3),
                x: index === currentStep ? 10 : 0
              }}
              className="flex items-center gap-4"
            >
              <motion.div
                animate={{
                  scale: index === currentStep ? [1, 1.2, 1] : 1,
                  rotate: index === currentStep ? [0, 360] : 0,
                }}
                transition={{
                  duration: 2,
                  repeat: index === currentStep ? Infinity : 0,
                }}
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  index === currentStep 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
                    : (index < currentStep ? 'bg-purple-500/50' : 'bg-white/10')
                }`}
              >
                <step.icon className="text-white" size={24} />
              </motion.div>
              <span className={`${
                index === currentStep ? 'text-white' : (index < currentStep ? 'text-white/70' : 'text-white/40')
              }`}>
                {step.text}
              </span>
            </motion.div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Progress: {Math.round(progress)}%</span>
            <span>Est. time remaining: {formatTime(timeRemaining)}</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;