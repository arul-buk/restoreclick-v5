"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, Sparkles, Heart } from "lucide-react";
import { useEffect } from "react";
import { trackEngagement } from "@/lib/analytics";

// This is our custom animated icon that "fills up" with color to show progress.
const AnimatedRestorationIcon = () => {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* The faded background circle */}
      <circle cx="40" cy="40" r="38" stroke="#A98B71" strokeWidth="4" opacity="0.3" />
      
      {/* The animated, colored circle that "fills" from bottom to top */}
      <motion.g
        clipPath="url(#clip)"
      >
        <circle cx="40" cy="40" r="38" stroke="#C8745A" strokeWidth="4" fill="#C8745A" fillOpacity="0.2" />
      </motion.g>

      {/* The mask that reveals the colored circle */}
      <defs>
        <clipPath id="clip">
          <motion.rect
            x="0"
            y="80"
            width="80"
            height="80"
            animate={{ y: [80, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </clipPath>
      </defs>
    </svg>
  );
};

interface ProcessingOverlayProps {
  totalImages: number;
  currentImage: number;
  completedImages: number;
  elapsedTime: number;
  maxTime: number;
}

const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  totalImages,
  currentImage,
  completedImages,
  elapsedTime,
  maxTime,
}) => {
  const timeRemaining = Math.max(0, maxTime - elapsedTime);
  const progress = Math.min(100, (elapsedTime / maxTime) * 100);
  const completionProgress = totalImages > 0 ? (completedImages / totalImages) * 100 : 0;

  // Track processing engagement
  useEffect(() => {
    trackEngagement('processing_started', { 
      total_images: totalImages,
      current_image: currentImage 
    });
  }, [totalImages, currentImage]);

  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="w-full max-w-md rounded-2xl bg-brand-background p-8 shadow-2xl text-center"
        >
          <div className="mx-auto mb-6">
            <AnimatedRestorationIcon />
          </div>

          <h2 className="font-serif text-3xl font-bold text-brand-text">
            Bringing Your Memories to Life...
          </h2>
          <p className="mt-2 text-brand-text/70">
            This may take a few moments. It's best to keep this page open while I work.
          </p>

          <div className="my-8 w-full">
            {/* Simplified Progress Section */}
            <div className="flex justify-between items-center mb-2 text-brand-text">
              <span className="font-semibold">Overall Progress</span>
              <span className="font-mono font-bold">{Math.round(completionProgress)}%</span>
            </div>
            <div className="w-full h-4 rounded-full bg-brand-secondary/20 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-brand-cta"
                initial={{ width: 0 }}
                animate={{ width: `${completionProgress}%` }}
                transition={{ ease: "linear", duration: 0.5 }}
              />
            </div>
            <p className="mt-4 text-sm text-brand-text/60">
              Restoring photo {currentImage} of {totalImages}...
            </p>
          </div>

          {/* Reassuring "While you wait" box */}
          <div className="rounded-lg bg-brand-accent/10 p-4 text-left border border-brand-accent/20">
            <div className="flex items-center text-brand-accent">
              <Lightbulb className="h-5 w-5 mr-3 flex-shrink-0" />
              <h3 className="font-semibold">A little magic is happening:</h3>
            </div>
            <ul className="mt-2 ml-8 list-disc text-brand-text/80 space-y-1 text-sm">
              <li>My AI is carefully finding the original colors.</li>
              <li>It's mending cracks, tears, and scratches.</li>
              <li>The wait is worth it for the best results!</li>
            </ul>
          </div>

        
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProcessingOverlay;
