"use client";

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface InteractiveViewerProps {
  photo: {
    originalUrl: string;
    restoredUrl: string;
  };
}

const InteractiveViewer: React.FC<InteractiveViewerProps> = ({ photo }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Touch event handling refs
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // Add touch event listeners to prevent browser navigation on horizontal swipes
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Store the initial touch position when the user first touches the screen
      touchStartX.current = e.targetTouches[0].clientX;
      touchStartY.current = e.targetTouches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartX.current || !touchStartY.current) {
        return;
      }
      
      const currentX = e.targetTouches[0].clientX;
      const currentY = e.targetTouches[0].clientY;

      // Calculate the absolute difference in movement
      const diffX = Math.abs(touchStartX.current - currentX);
      const diffY = Math.abs(touchStartY.current - currentY);

      // Check if the swipe is more horizontal than vertical
      if (diffX > diffY) {
        // This is a horizontal swipe. Stop it from bubbling up to the browser.
        e.stopPropagation();
        e.preventDefault();
      }
      // If it's a vertical swipe, the event is not stopped, allowing normal page scrolling.
    };

    // `passive: false` is crucial for stopPropagation() and preventDefault() to work reliably on touchmove
    node.addEventListener('touchstart', handleTouchStart, { passive: true });
    node.addEventListener('touchmove', handleTouchMove, { passive: false });

    // Cleanup function to remove listeners when the component is unmounted
    return () => {
      node.removeEventListener('touchstart', handleTouchStart);
      node.removeEventListener('touchmove', handleTouchMove);
    };
  }, []); // Empty dependency array means this effect runs only once

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    }
  };

  const handleMouseLeave = () => {
    setSliderPosition(50);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    }
  };

  const handleTouchEnd = () => {
    setSliderPosition(50);
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-72 sm:h-80 md:h-96 lg:h-[500px] xl:h-[600px] 2xl:h-[700px] overflow-hidden cursor-col-resize select-none bg-brand-background rounded-lg shadow-soft"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Restored image (background) */}
      <img 
        src={photo.restoredUrl} 
        alt="Restored photo"
        className="absolute inset-0 w-full h-full object-contain select-none"
        draggable={false}
      />
      
      {/* Original image (clipped) */}
      <div 
        className="absolute inset-0 overflow-hidden" 
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img 
          src={photo.originalUrl} 
          alt="Original photo"
          className="w-full h-full object-contain select-none"
          draggable={false}
        />
      </div>
      
      {/* Slider handle */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg z-20 pointer-events-none"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-brand-border">
          <ChevronLeft className="w-3 h-3 text-brand-text -mr-1" />
          <ChevronRight className="w-3 h-3 text-brand-text -ml-1" />
        </div>
      </div>
      
      {/* Labels */}
      <div className="absolute top-4 left-4 bg-brand-background/70 text-brand-text px-3 py-1 rounded-full text-sm font-medium z-20 pointer-events-none">
        Before
      </div>
      <div className="absolute top-4 right-4 bg-brand-background/70 text-brand-text px-3 py-1 rounded-full text-sm font-medium z-20 pointer-events-none">
        After
      </div>
    </div>
  );
};

export default InteractiveViewer;
